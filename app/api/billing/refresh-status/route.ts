import { NextResponse } from "next/server";
import { BillingAuthError, eventIdFor, verifyBillingUser } from "@/lib/billing/server";
import { getAdminFirestore, ServerSetupError } from "@/lib/firebase/admin";
import { isPlanExpired, normalizePlanTier, normalizeSubscriptionStatus } from "@/lib/plans";
import { withApiLogging } from "@/lib/server/observability";
import { enforceRateLimit, RateLimitError } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withApiLogging("billing.refresh-status", async (logContext) => {
  try {
    const user = await verifyBillingUser(request);
    logContext.userId = user.uid;
    enforceRateLimit({ request, action: "billing:refresh-status", userId: user.uid, limit: 10, windowMs: 60_000 });
    const { db, FieldValue } = await getAdminFirestore();
    const profileRef = db.collection("userProfiles").doc(user.uid);
    const profileSnapshot = await profileRef.get();

    if (!profileSnapshot.exists) {
      return NextResponse.json({ ok: true, expired: false });
    }

    const profile = profileSnapshot.data()!;
    const plan = normalizePlanTier(profile.plan);

    const expiryProfile = {
      plan,
      subscriptionStatus: normalizeSubscriptionStatus(profile.subscriptionStatus),
      planExpiresAt: profile.planExpiresAt ?? null
    };

    if (!isPlanExpired(expiryProfile)) {
      return NextResponse.json({ ok: true, expired: false, plan });
    }

    const eventId = eventIdFor("plan_expired", `${user.uid}_${plan}_${profile.planExpiresAt?.toMillis?.() ?? Date.now()}`);

    await db.runTransaction(async (transaction) => {
      transaction.set(
        profileRef,
        {
          subscriptionStatus: "expired",
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
      transaction.set(
        db.collection("billingEvents").doc(eventId),
        {
          id: eventId,
          userId: user.uid,
          type: "plan_expired",
          plan,
          billingCycle: profile.billingCycle ?? "none",
          orderId: profile.razorpayOrderId ?? "",
          paymentId: profile.razorpayPaymentId ?? "",
          source: "api",
          createdAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    });

    return NextResponse.json({ ok: true, expired: true, plan: "free" });
  } catch (error) {
    logContext.errorClass = error instanceof Error ? error.name : "UnknownError";
    if (error instanceof BillingAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof RateLimitError) {
      logContext.rateLimited = true;
      return NextResponse.json(
        { error: error.message, retryAfterSeconds: error.retryAfterSeconds },
        { status: 429 }
      );
    }

    if (error instanceof ServerSetupError) {
      logContext.setup = true;
      return NextResponse.json({ error: error.message, setup: true }, { status: 503 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not refresh billing status." },
      { status: 500 }
    );
  }
  });
}
