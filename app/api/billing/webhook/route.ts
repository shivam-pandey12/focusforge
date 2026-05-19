import { NextResponse } from "next/server";
import { isPaidBillingCycle, isPaidPlan } from "@/lib/billing/config";
import { adminTimestampFromExpiry, eventIdFor } from "@/lib/billing/server";
import { verifyRazorpayWebhookSignature, RazorpaySetupError } from "@/lib/billing/razorpay";
import { getAdminFirestore, ServerSetupError } from "@/lib/firebase/admin";
import { withApiLogging } from "@/lib/server/observability";
import type { PaidBillingCycle, PaidPlanTier } from "@/lib/plans";

export const runtime = "nodejs";

interface RazorpayWebhookPayload {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
        amount?: number;
        currency?: string;
        method?: string;
        error_description?: string;
      };
    };
  };
}

function getPaymentEntity(payload: RazorpayWebhookPayload) {
  return payload.payload?.payment?.entity ?? {};
}

function safeWebhookEventId(eventType: string, entityId: string): string {
  return `${eventType}_${entityId || Date.now()}`.replace(/[^\w-]/g, "_");
}

export async function POST(request: Request) {
  return withApiLogging("billing.webhook", async (logContext) => {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") ?? "";

    if (!signature || !verifyRazorpayWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
    }

    const payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
    const eventType = String(payload.event ?? "unknown");
    const paymentEntity = getPaymentEntity(payload);
    const paymentId = String(paymentEntity.id ?? "");
    const orderId = String(paymentEntity.order_id ?? "");
    const eventId = safeWebhookEventId(eventType, paymentId || orderId);
    const { db, FieldValue } = await getAdminFirestore();
    const subscriptionEventRef = db.collection("subscriptionEvents").doc(eventId);
    const existingEvent = await subscriptionEventRef.get();

    if (existingEvent.exists && existingEvent.data()?.processed) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const summary = {
      status: String(paymentEntity.status ?? ""),
      amount: Number(paymentEntity.amount ?? 0),
      currency: String(paymentEntity.currency ?? ""),
      method: String(paymentEntity.method ?? "")
    };

    await subscriptionEventRef.set(
      {
        id: eventId,
        eventType,
        razorpayEntityId: paymentId || orderId || eventId,
        processed: false,
        receivedAt: FieldValue.serverTimestamp(),
        rawPayloadSummary: summary
      },
      { merge: true }
    );

    if (eventType !== "payment.captured" && eventType !== "payment.failed") {
      await subscriptionEventRef.set({ processed: true }, { merge: true });
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (!orderId) {
      await subscriptionEventRef.set({ processed: true }, { merge: true });
      return NextResponse.json({ ok: true, missingOrder: true });
    }

    const paymentRef = db.collection("payments").doc(orderId);
    const paymentSnapshot = await paymentRef.get();

    if (!paymentSnapshot.exists) {
      await subscriptionEventRef.set({ processed: true, userId: null }, { merge: true });
      return NextResponse.json({ ok: true, missingPaymentRecord: true });
    }

    const payment = paymentSnapshot.data()!;
    const userId = String(payment.userId ?? "");
    logContext.userId = userId;
    if (!isPaidPlan(payment.plan) || !isPaidBillingCycle(payment.billingCycle)) {
      await subscriptionEventRef.set({ userId, processed: true, invalidPaymentPlan: true }, { merge: true });
      return NextResponse.json({ ok: true, invalidPaymentPlan: true });
    }

    const plan = payment.plan as PaidPlanTier;
    const billingCycle = payment.billingCycle as PaidBillingCycle;

    if (eventType === "payment.failed") {
      await db.runTransaction(async (transaction) => {
        transaction.set(
          paymentRef,
          {
            razorpayPaymentId: paymentId,
            status: "failed",
            updatedAt: FieldValue.serverTimestamp()
          },
          { merge: true }
        );
        transaction.set(
          db.collection("billingEvents").doc(eventIdFor("webhook_payment_failed", orderId)),
          {
            id: eventIdFor("webhook_payment_failed", orderId),
            userId,
            type: "webhook_payment_failed",
            plan,
            billingCycle,
            paymentId,
            orderId,
            source: "webhook",
            metadata: { error: String(paymentEntity.error_description ?? "") },
            createdAt: FieldValue.serverTimestamp()
          },
          { merge: true }
        );
        transaction.set(subscriptionEventRef, { userId, processed: true }, { merge: true });
      });

      return NextResponse.json({ ok: true, status: "failed" });
    }

    await db.runTransaction(async (transaction) => {
      const latestPaymentSnapshot = await transaction.get(paymentRef);
      const latestPayment = latestPaymentSnapshot.data();

      transaction.set(
        paymentRef,
        {
          razorpayPaymentId: paymentId,
          status: "verified",
          verifiedAt: latestPayment?.verifiedAt ?? FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );

      if (latestPayment?.status !== "verified") {
        transaction.set(
          db.collection("userProfiles").doc(userId),
          {
            userId,
            plan,
            subscriptionStatus: "active",
            billingCycle,
            planStartedAt: FieldValue.serverTimestamp(),
            planExpiresAt: adminTimestampFromExpiry(billingCycle),
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
            lastPaymentVerifiedAt: FieldValue.serverTimestamp(),
            cancelAtPeriodEnd: false,
            updatedAt: FieldValue.serverTimestamp()
          },
          { merge: true }
        );
        transaction.set(
          db.collection("billingEvents").doc(eventIdFor("plan_activated", `webhook_${orderId}`)),
          {
            id: eventIdFor("plan_activated", `webhook_${orderId}`),
            userId,
            type: "plan_activated",
            plan,
            billingCycle,
            paymentId,
            orderId,
            source: "webhook",
            createdAt: FieldValue.serverTimestamp()
          },
          { merge: true }
        );
      }

      transaction.set(
        db.collection("billingEvents").doc(eventIdFor("webhook_payment_captured", orderId)),
        {
          id: eventIdFor("webhook_payment_captured", orderId),
          userId,
          type: "webhook_payment_captured",
          plan,
          billingCycle,
          paymentId,
          orderId,
          source: "webhook",
          createdAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
      transaction.set(subscriptionEventRef, { userId, processed: true }, { merge: true });
    });

    return NextResponse.json({ ok: true, status: "captured" });
  } catch (error) {
    logContext.errorClass = error instanceof Error ? error.name : "UnknownError";
    if (error instanceof ServerSetupError || error instanceof RazorpaySetupError) {
      logContext.setup = true;
      return NextResponse.json({ error: error.message, setup: true }, { status: 503 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook could not be processed." },
      { status: 500 }
    );
  }
  });
}
