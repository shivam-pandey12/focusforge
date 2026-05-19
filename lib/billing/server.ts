import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { calculatePlanExpiry, type BillingCycle, type PlanTier } from "@/lib/plans";
import type { BillingEventSource, BillingEventType } from "@/types";

export interface VerifiedBillingUser {
  uid: string;
  email?: string;
}

export class BillingAuthError extends Error {
  code = "billing_auth_required";

  constructor(message = "Login is required for billing actions.") {
    super(message);
    this.name = "BillingAuthError";
  }
}

export async function verifyBillingUser(request: Request): Promise<VerifiedBillingUser> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    throw new BillingAuthError();
  }

  const auth = getAdminAuth();

  try {
    const decoded = await auth.verifyIdToken(token);

    return {
      uid: decoded.uid,
      email: typeof decoded.email === "string" ? decoded.email : undefined
    };
  } catch {
    throw new BillingAuthError("Your billing session expired. Please login again.");
  }
}

export function eventIdFor(type: BillingEventType, seed: string): string {
  return `${type}_${seed}`.replace(/[^\w-]/g, "_");
}

export async function writeBillingEvent(input: {
  id: string;
  userId?: string;
  type: BillingEventType;
  plan?: PlanTier;
  billingCycle?: BillingCycle;
  paymentId?: string;
  orderId?: string;
  source: BillingEventSource;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  const { db, FieldValue } = await getAdminFirestore();

  await db.collection("billingEvents").doc(input.id).set(
    {
      ...input,
      createdAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

export function adminTimestampFromExpiry(billingCycle: BillingCycle, from = new Date()) {
  return calculatePlanExpiry(billingCycle, from);
}
