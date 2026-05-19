import Link from "next/link";
import PlanBadge from "@/components/PlanBadge";
import { getPlanDefinition, type CheckoutBillingCycle, type PlanTier } from "@/lib/plans";

interface PlanComparisonCardProps {
  plan: PlanTier;
  currentPlan?: PlanTier;
  loggedIn: boolean;
  billingCycle: CheckoutBillingCycle;
  onUpgrade?: (plan: Exclude<PlanTier, "free">) => void;
  busy?: boolean;
  paymentsActive?: boolean;
}

export default function PlanComparisonCard({ plan, currentPlan, loggedIn, billingCycle, onUpgrade, busy, paymentsActive = true }: PlanComparisonCardProps) {
  const definition = getPlanDefinition(plan);
  const current = currentPlan === plan;
  const href = loggedIn ? "/settings/billing" : plan === "free" ? "/signup" : "/signup";
  const buttonLabel = current ? "Current Plan" : plan === "free" ? "Start free" : `Upgrade to ${definition.shortName}`;
  const waitingForPayments = plan !== "free" && !current && !paymentsActive;
  const priceLabel =
    billingCycle === "monthly"
      ? definition.monthlyPrice ?? definition.seasonPrice
      : billingCycle === "season"
        ? definition.seasonPrice
        : definition.yearlyPrice;

  return (
    <article className={plan === "pro" ? "pricing-card pricing-card-popular" : "pricing-card"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <PlanBadge plan={plan} />
          {definition.badge ? <span className="ml-2 badge badge-open">{definition.badge}</span> : null}
        </div>
      </div>
      <h3 className="mt-5 text-3xl font-bold text-forge-text">{definition.displayName}</h3>
      <p className="mt-3 text-base leading-7 text-forge-muted">{definition.description}</p>
      <p className="mt-6 text-4xl font-bold text-forge-text">
        {priceLabel}
      </p>
      {waitingForPayments ? (
        <>
          <Link className="btn-secondary mt-6 w-full" href={loggedIn ? "/support?category=payment_issue" : "/signup"}>
            Activation waiting
          </Link>
          <p className="mt-3 text-sm font-semibold leading-6 text-forge-muted">
            Paid checkout opens after Razorpay live activation. Starter access is available now.
          </p>
        </>
      ) : loggedIn && plan !== "free" && !current && onUpgrade ? (
        <button
          className={plan === "pro" ? "btn-primary mt-6 w-full" : "btn-secondary mt-6 w-full"}
          disabled={Boolean(busy)}
          type="button"
          onClick={() => onUpgrade(plan)}
        >
          {busy ? "Preparing..." : buttonLabel}
        </button>
      ) : (
        <Link className={plan === "pro" ? "btn-primary mt-6 w-full" : "btn-secondary mt-6 w-full"} href={href}>
          {buttonLabel}
        </Link>
      )}
      <ul className="mt-6 space-y-3">
        {definition.highlights.map((item) => (
          <li className="flex gap-3 text-base font-semibold text-forge-muted" key={item}>
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-forge-gold" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
