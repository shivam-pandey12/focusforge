import { NextResponse } from "next/server";
import { BillingAuthError, eventIdFor, verifyBillingUser } from "@/lib/billing/server";
import { getAdminFirestore, ServerSetupError } from "@/lib/firebase/admin";
import { withApiLogging } from "@/lib/server/observability";
import { enforceRateLimit, RateLimitError } from "@/lib/server/rateLimit";
import type { PlanTier } from "@/lib/plans";

export const runtime = "nodejs";

function isPlanTier(value: unknown): value is PlanTier {
  return value === "free" || value === "pro" || value === "elite";
}

export async function POST(request: Request) {
  return withApiLogging("billing.dev-switch-plan", async (logContext) => {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Developer plan switching is disabled in production." }, { status: 404 });
  }

  try {
    const user = await verifyBillingUser(request);
    logContext.userId = user.uid;
    enforceRateLimit({ request, action: "billing:dev-switch-plan", userId: user.uid, limit: 10, windowMs: 60_000 });
    const body = (await request.json()) as { plan?: unknown };

    if (!isPlanTier(body.plan)) {
      return NextResponse.json({ error: "Choose a valid plan for developer testing." }, { status: 400 });
    }

    const plan = body.plan;
    const { db, FieldValue } = await getAdminFirestore();
    const eventSeed = `${user.uid}_${plan}_${Date.now()}`;

    await db.runTransaction(async (transaction) => {
      transaction.set(
        db.collection("userProfiles").doc(user.uid),
        {
          userId: user.uid,
          plan,
          subscriptionStatus: plan === "free" ? "free" : "manual",
          billingCycle: "none",
          planStartedAt: FieldValue.serverTimestamp(),
          planExpiresAt: null,
          trialEndsAt: null,
          cancelAtPeriodEnd: false,
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
      transaction.set(
        db.collection("billingEvents").doc(eventIdFor("manual_dev_switch", eventSeed)),
        {
          id: eventIdFor("manual_dev_switch", eventSeed),
          userId: user.uid,
          type: "manual_dev_switch",
          plan,
          billingCycle: "none",
          source: "development",
          createdAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    });

    return NextResponse.json({ ok: true, plan });
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
      { error: error instanceof Error ? error.message : "Could not switch developer plan." },
      { status: 500 }
    );
  }
  });
}
