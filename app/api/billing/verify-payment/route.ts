import { NextResponse } from "next/server";
import { isPaidBillingCycle, isPaidPlan } from "@/lib/billing/config";
import { adminTimestampFromExpiry, BillingAuthError, eventIdFor, verifyBillingUser } from "@/lib/billing/server";
import { verifyRazorpayPaymentSignature, RazorpaySetupError } from "@/lib/billing/razorpay";
import { getAdminFirestore, ServerSetupError } from "@/lib/firebase/admin";
import { withApiLogging } from "@/lib/server/observability";
import { enforceRateLimit, RateLimitError } from "@/lib/server/rateLimit";
import type { PaidBillingCycle, PaidPlanTier } from "@/lib/plans";

export const runtime = "nodejs";

const supportMessage =
  "If money was deducted but your plan did not activate, please contact support with your payment ID.";

function jsonError(message: string, status = 400, setup = false, paymentId?: string) {
  return NextResponse.json({ error: message, setup, supportMessage, paymentId }, { status });
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  return withApiLogging("billing.verify-payment", async (logContext) => {
  try {
    const user = await verifyBillingUser(request);
    logContext.userId = user.uid;
    enforceRateLimit({ request, action: "billing:verify-payment", userId: user.uid, limit: 10, windowMs: 60_000 });
    const body = (await request.json()) as {
      razorpay_order_id?: unknown;
      razorpay_payment_id?: unknown;
      razorpay_signature?: unknown;
    };
    const orderId = safeString(body.razorpay_order_id);
    const paymentId = safeString(body.razorpay_payment_id);
    const signature = safeString(body.razorpay_signature);

    if (!orderId || !paymentId || !signature) {
      return jsonError("Payment verification details are incomplete.", 400, false, paymentId);
    }

    const { db, FieldValue } = await getAdminFirestore();
    const paymentRef = db.collection("payments").doc(orderId);
    const paymentSnapshot = await paymentRef.get();

    if (!paymentSnapshot.exists) {
      return jsonError("Payment record was not found for this order.", 404, false, paymentId);
    }

    const payment = paymentSnapshot.data()!;

    if (payment.userId !== user.uid) {
      return jsonError("This payment does not belong to the current user.", 403, false, paymentId);
    }

    if (payment.status === "verified") {
      return NextResponse.json({ ok: true, alreadyVerified: true, plan: payment.plan, billingCycle: payment.billingCycle });
    }

    if (!verifyRazorpayPaymentSignature(orderId, paymentId, signature)) {
      await paymentRef.set(
        {
          razorpayPaymentId: paymentId,
          status: "failed",
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
      return jsonError("Payment could not be verified.", 400, false, paymentId);
    }

    if (!isPaidPlan(payment.plan) || !isPaidBillingCycle(payment.billingCycle)) {
      return jsonError("Payment record has invalid plan details. Contact support with your order ID.", 400, false, paymentId);
    }

    const plan = payment.plan as PaidPlanTier;
    const billingCycle = payment.billingCycle as PaidBillingCycle;
    const expiry = adminTimestampFromExpiry(billingCycle);
    const profileRef = db.collection("userProfiles").doc(user.uid);
    const verifiedEventRef = db.collection("billingEvents").doc(eventIdFor("payment_verified", orderId));
    const activatedEventRef = db.collection("billingEvents").doc(eventIdFor("plan_activated", orderId));

    await db.runTransaction(async (transaction) => {
      const latestPaymentSnapshot = await transaction.get(paymentRef);
      const latestPayment = latestPaymentSnapshot.data();

      if (latestPayment?.status === "verified") {
        return;
      }

      transaction.set(
        paymentRef,
        {
          razorpayPaymentId: paymentId,
          status: "verified",
          verifiedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
      transaction.set(
        profileRef,
        {
          userId: user.uid,
          plan,
          subscriptionStatus: "active",
          billingCycle,
          planStartedAt: FieldValue.serverTimestamp(),
          planExpiresAt: expiry,
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          lastPaymentVerifiedAt: FieldValue.serverTimestamp(),
          cancelAtPeriodEnd: false,
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
      transaction.set(
        verifiedEventRef,
        {
          id: verifiedEventRef.id,
          userId: user.uid,
          type: "payment_verified",
          plan,
          billingCycle,
          paymentId,
          orderId,
          source: "api",
          createdAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
      transaction.set(
        activatedEventRef,
        {
          id: activatedEventRef.id,
          userId: user.uid,
          type: "plan_activated",
          plan,
          billingCycle,
          paymentId,
          orderId,
          source: "api",
          createdAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    });

    return NextResponse.json({ ok: true, plan, billingCycle, paymentId, orderId });
  } catch (error) {
    logContext.errorClass = error instanceof Error ? error.name : "UnknownError";
    if (error instanceof BillingAuthError) {
      return jsonError(error.message, 401);
    }

    if (error instanceof RateLimitError) {
      logContext.rateLimited = true;
      return NextResponse.json(
        {
          error: error.message,
          retryAfterSeconds: error.retryAfterSeconds,
          supportMessage
        },
        { status: 429 }
      );
    }

    if (error instanceof ServerSetupError || error instanceof RazorpaySetupError) {
      logContext.setup = true;
      return jsonError(error.message, 503, true);
    }

    return jsonError(error instanceof Error ? error.message : "Payment could not be verified.", 500);
  }
  });
}
