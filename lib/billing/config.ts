import type { CheckoutBillingCycle, PaidBillingCycle, PaidPlanTier } from "@/lib/plans";

export const BILLING_CURRENCY = "INR";
export const PAYMENTS_ACTIVE = process.env.NEXT_PUBLIC_PAYMENTS_ACTIVE === "true";
export const PAYMENT_ACTIVATION_MESSAGE =
  "Paid checkout is temporarily paused while Razorpay configuration is reviewed. Starter access is available now, and Pro/Elite checkout will reopen after payments are enabled.";

export const BILLING_PRICE_CONFIG: Record<PaidPlanTier, Record<PaidBillingCycle, number>> = {
  pro: {
    monthly: 4900,
    season: 14900,
    yearly: 39900
  },
  elite: {
    monthly: 9900,
    season: 29900,
    yearly: 69900
  }
};

export const CHECKOUT_BILLING_CYCLES: CheckoutBillingCycle[] = ["monthly", "season", "yearly"];

export function isPaidPlan(value: unknown): value is PaidPlanTier {
  return value === "pro" || value === "elite";
}

export function isPaidBillingCycle(value: unknown): value is PaidBillingCycle {
  return value === "monthly" || value === "season" || value === "yearly";
}

export function isCheckoutBillingCycle(value: unknown): value is CheckoutBillingCycle {
  return value === "monthly" || value === "season" || value === "yearly";
}

export function getBillingAmount(plan: PaidPlanTier, billingCycle: PaidBillingCycle): number {
  return BILLING_PRICE_CONFIG[plan][billingCycle];
}

export function getBillingDisplayName(plan: PaidPlanTier): string {
  return plan === "pro" ? "Forge Pro" : "Forge Elite";
}

export function getBillingCycleLabel(billingCycle: PaidBillingCycle): string {
  if (billingCycle === "season") {
    return "4-month season";
  }

  if (billingCycle === "yearly") {
    return "Yearly";
  }

  return "Monthly";
}
