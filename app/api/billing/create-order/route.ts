import { NextResponse } from "next/server";
import { BILLING_CURRENCY, PAYMENT_ACTIVATION_MESSAGE, PAYMENTS_ACTIVE, getBillingAmount, getBillingCycleLabel, getBillingDisplayName, isCheckoutBillingCycle, isPaidPlan } from "@/lib/billing/config";
import { createRazorpayOrder, getPublicRazorpayKey, getRazorpayCheckoutConfigId, isRazorpayTestMode, RazorpaySetupError } from "@/lib/billing/razorpay";
import { BillingAuthError, verifyBillingUser } from "@/lib/billing/server";
import { getAdminFirestore, ServerSetupError } from "@/lib/firebase/admin";
import { withApiLogging } from "@/lib/server/observability";
import { enforceRateLimit, RateLimitError } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

function jsonError(message: string, status = 400, setup = false) {
  return NextResponse.json({ error: message, setup }, { status });
}

export async function POST(request: Request) {
  return withApiLogging("billing.create-order", async (logContext) => {
  try {
    const user = await verifyBillingUser(request);
    logContext.userId = user.uid;
    enforceRateLimit({ request, action: "billing:create-order", userId: user.uid, limit: 5, windowMs: 60_000 });
    const body = (await request.json()) as { plan?: unknown; billingCycle?: unknown };

    if (!PAYMENTS_ACTIVE) {
      return NextResponse.json(
        { error: PAYMENT_ACTIVATION_MESSAGE, setup: true, paymentActivationPending: true },
        { status: 503 }
      );
    }

    if (!isPaidPlan(body.plan)) {
      return jsonError("Choose a valid paid plan.", 400);
    }

    if (!isCheckoutBillingCycle(body.billingCycle)) {
      return jsonError("Choose a monthly, 4-month season, or yearly pass.", 400);
    }

    const amount = getBillingAmount(body.plan, body.billingCycle);
    const receipt = `${user.uid}_${Date.now()}`.slice(0, 40);
    const keyId = getPublicRazorpayKey();
    const order = await createRazorpayOrder({
      amount,
      currency: BILLING_CURRENCY,
      receipt,
      checkoutConfigId: getRazorpayCheckoutConfigId(),
      notes: {
        userId: user.uid,
        plan: body.plan,
        billingCycle: body.billingCycle
      }
    });

    const { db, FieldValue } = await getAdminFirestore();

    await db.collection("payments").doc(order.id).set({
      userId: user.uid,
      plan: body.plan,
      billingCycle: body.billingCycle,
      amount,
      currency: BILLING_CURRENCY,
      razorpayOrderId: order.id,
      status: "created",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    return NextResponse.json({
      keyId,
      orderId: order.id,
      amount,
      currency: BILLING_CURRENCY,
      plan: body.plan,
      billingCycle: body.billingCycle,
      displayName: getBillingDisplayName(body.plan),
      billingCycleLabel: getBillingCycleLabel(body.billingCycle),
      email: user.email ?? "",
      testMode: isRazorpayTestMode(keyId)
    });
  } catch (error) {
    logContext.errorClass = error instanceof Error ? error.name : "UnknownError";
    if (error instanceof BillingAuthError) {
      return jsonError(error.message, 401);
    }

    if (error instanceof RateLimitError) {
      logContext.rateLimited = true;
      return NextResponse.json(
        { error: error.message, retryAfterSeconds: error.retryAfterSeconds },
        { status: 429 }
      );
    }

    if (error instanceof ServerSetupError || error instanceof RazorpaySetupError) {
      logContext.setup = true;
      return jsonError(error.message, 503, true);
    }

    return jsonError(error instanceof Error ? error.message : "Could not prepare secure checkout.", 500);
  }
  });
}
