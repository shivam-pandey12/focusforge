import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore, ServerSetupError } from "@/lib/firebase/admin";
import { RequestAuthError, verifyAdminRequestUser } from "@/lib/server/adminAccess";
import { withApiLogging } from "@/lib/server/observability";
import { enforceRateLimit, RateLimitError } from "@/lib/server/rateLimit";
import type { BillingCycle, PlanTier, SubscriptionStatus } from "@/lib/plans";

export const runtime = "nodejs";

const PLANS: PlanTier[] = ["free", "pro", "elite"];
const STATUSES: SubscriptionStatus[] = ["free", "trial", "active", "inactive", "expired", "manual"];
const CYCLES: BillingCycle[] = ["none", "monthly", "season", "yearly"];

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

function asBoolean(value: unknown): boolean {
  return value === true || value === "true";
}

function asNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function nullableDate(value: unknown): Date | null {
  const text = cleanText(value, 80);

  if (!text) {
    return null;
  }

  const parsed = new Date(text);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Use a valid date/time for plan or trial fields.");
  }

  return parsed;
}

function jsonError(message: string, status = 400, setup = false) {
  return NextResponse.json({ error: message, setup }, { status });
}

export async function POST(request: Request) {
  return withApiLogging("admin.user-update", async (logContext) => {
    try {
      const admin = await verifyAdminRequestUser(request);
      logContext.userId = admin.uid;
      enforceRateLimit({ request, action: "admin:user-update", userId: admin.uid, limit: 20, windowMs: 60_000 });

      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const uid = cleanText(body.uid, 160);
      const plan = cleanText(body.plan, 20) as PlanTier;
      const subscriptionStatus = cleanText(body.subscriptionStatus, 30) as SubscriptionStatus;
      const billingCycle = cleanText(body.billingCycle, 20) as BillingCycle;

      if (!uid) {
        return jsonError("Missing user ID.");
      }

      if (!PLANS.includes(plan)) {
        return jsonError("Choose a valid plan.");
      }

      if (!STATUSES.includes(subscriptionStatus)) {
        return jsonError("Choose a valid subscription status.");
      }

      if (!CYCLES.includes(billingCycle)) {
        return jsonError("Choose a valid billing cycle.");
      }

      if (plan === "free" && (subscriptionStatus === "active" || billingCycle !== "none")) {
        return jsonError("Free users must use free/inactive/manual status and no billing cycle.");
      }

      const auth = getAdminAuth();
      const { db, FieldValue } = await getAdminFirestore();
      const displayName = cleanText(body.displayName, 120);
      const disabled = asBoolean(body.disabled);
      const planExpiresAt = nullableDate(body.planExpiresAt);
      const trialEndsAt = nullableDate(body.trialEndsAt);
      const dailyStudyTargetMinutes = asNumber(body.dailyStudyTargetMinutes, 120, 1, 1440);
      const preferredFocusDuration = asNumber(body.preferredFocusDuration, 25, 5, 180);
      const studyGoal = cleanText(body.studyGoal, 120);
      const oldProfileSnapshot = await db.collection("userProfiles").doc(uid).get();
      const oldProfile = oldProfileSnapshot.exists ? oldProfileSnapshot.data() ?? {} : {};

      await auth.updateUser(uid, {
        displayName: displayName || undefined,
        disabled
      });

      await db.runTransaction(async (transaction) => {
        transaction.set(
          db.collection("userProfiles").doc(uid),
          {
            userId: uid,
            ...(displayName ? { displayName } : {}),
            ...(studyGoal ? { studyGoal } : {}),
            plan,
            subscriptionStatus,
            billingCycle,
            planExpiresAt,
            trialEndsAt,
            cancelAtPeriodEnd: asBoolean(body.cancelAtPeriodEnd),
            dailyStudyTargetMinutes,
            preferredFocusDuration,
            notificationEnabled: asBoolean(body.notificationEnabled),
            emailNotificationsEnabled: asBoolean(body.emailNotificationsEnabled),
            onboardingCompleted: asBoolean(body.onboardingCompleted),
            updatedAt: FieldValue.serverTimestamp()
          },
          { merge: true }
        );

        transaction.set(
          db.collection("billingEvents").doc(`admin_profile_update_${uid}_${Date.now()}`),
          {
            userId: uid,
            type: "admin_profile_update",
            plan,
            billingCycle,
            source: "api",
            metadata: {
              adminUid: admin.uid,
              previousPlan: String(oldProfile.plan ?? "free"),
              previousStatus: String(oldProfile.subscriptionStatus ?? "free")
            },
            createdAt: FieldValue.serverTimestamp()
          },
          { merge: true }
        );
      });

      return NextResponse.json({ ok: true, uid, plan, subscriptionStatus, billingCycle });
    } catch (error) {
      logContext.errorClass = error instanceof Error ? error.name : "UnknownError";

      if (error instanceof RequestAuthError) {
        return jsonError(error.message, error.status);
      }

      if (error instanceof RateLimitError) {
        logContext.rateLimited = true;
        return NextResponse.json({ error: error.message, retryAfterSeconds: error.retryAfterSeconds }, { status: 429 });
      }

      if (error instanceof ServerSetupError) {
        logContext.setup = true;
        return jsonError(error.message, 503, true);
      }

      return jsonError(error instanceof Error ? error.message : "Could not update user.", 500);
    }
  });
}
