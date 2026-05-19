import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore, ServerSetupError } from "@/lib/firebase/admin";
import { RequestAuthError, verifyAdminRequestUser } from "@/lib/server/adminAccess";
import { withApiLogging } from "@/lib/server/observability";

export const runtime = "nodejs";

function toIso(value: unknown): string | null {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  return null;
}

function jsonError(message: string, status = 400, setup = false) {
  return NextResponse.json({ error: message, setup }, { status });
}

export async function POST(request: Request) {
  return withApiLogging("admin.user-lookup", async (logContext) => {
    try {
      const admin = await verifyAdminRequestUser(request);
      logContext.userId = admin.uid;
      const body = (await request.json().catch(() => ({}))) as { query?: unknown };
      const lookup = String(body.query ?? "").trim();

      if (!lookup) {
        return jsonError("Enter a user ID or email.");
      }

      const auth = getAdminAuth();
      const userRecord = lookup.includes("@") ? await auth.getUserByEmail(lookup) : await auth.getUser(lookup);
      const { db } = await getAdminFirestore();
      const profileSnapshot = await db.collection("userProfiles").doc(userRecord.uid).get();
      const profile = profileSnapshot.exists ? profileSnapshot.data() ?? {} : {};

      return NextResponse.json({
        user: {
          uid: userRecord.uid,
          email: userRecord.email ?? "",
          displayName: userRecord.displayName ?? "",
          disabled: userRecord.disabled,
          createdAt: userRecord.metadata.creationTime,
          lastSignInAt: userRecord.metadata.lastSignInTime
        },
        profile: {
          displayName: typeof profile.displayName === "string" ? profile.displayName : userRecord.displayName ?? "",
          studyGoal: typeof profile.studyGoal === "string" ? profile.studyGoal : "",
          plan: String(profile.plan ?? "free"),
          subscriptionStatus: String(profile.subscriptionStatus ?? "free"),
          billingCycle: String(profile.billingCycle ?? "none"),
          planStartedAt: toIso(profile.planStartedAt),
          planExpiresAt: toIso(profile.planExpiresAt),
          trialEndsAt: toIso(profile.trialEndsAt),
          cancelAtPeriodEnd: Boolean(profile.cancelAtPeriodEnd),
          dailyStudyTargetMinutes: Number(profile.dailyStudyTargetMinutes ?? 120),
          preferredFocusDuration: Number(profile.preferredFocusDuration ?? 25),
          notificationEnabled: profile.notificationEnabled !== false,
          emailNotificationsEnabled: profile.emailNotificationsEnabled !== false,
          onboardingCompleted: Boolean(profile.onboardingCompleted),
          razorpayOrderId: typeof profile.razorpayOrderId === "string" ? profile.razorpayOrderId : "",
          razorpayPaymentId: typeof profile.razorpayPaymentId === "string" ? profile.razorpayPaymentId : "",
          deletionRequested: Boolean(profile.deletionRequested)
        }
      });
    } catch (error) {
      logContext.errorClass = error instanceof Error ? error.name : "UnknownError";

      if (error instanceof RequestAuthError) {
        return jsonError(error.message, error.status);
      }

      if (error instanceof ServerSetupError) {
        logContext.setup = true;
        return jsonError(error.message, 503, true);
      }

      return jsonError(error instanceof Error ? error.message : "Could not find that user.", 404);
    }
  });
}
