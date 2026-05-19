import { getPlanDefinition, type PlanTier } from "@/lib/plans";

interface LimitReachedNoticeProps {
  currentPlan: PlanTier;
  limitLabel: string;
  requiredPlan?: PlanTier;
  usageLabel?: string;
}

export default function LimitReachedNotice({ currentPlan, limitLabel, requiredPlan = "pro", usageLabel }: LimitReachedNoticeProps) {
  const current = getPlanDefinition(currentPlan);
  const required = getPlanDefinition(requiredPlan);

  return (
    <div className="limit-notice">
      <p className="text-base font-bold text-forge-text">
        {current.displayName} limit reached{usageLabel ? ` (${usageLabel})` : ""}
      </p>
      <p className="mt-1 text-base leading-7 text-forge-muted">
        {limitLabel} Your existing data is safe and stays editable. Upgrade to {required.displayName} to create more.
      </p>
      <p className="mt-2 text-sm font-bold text-forge-muted">Included in {required.displayName}{requiredPlan === "pro" ? " and Forge Elite" : ""}.</p>
    </div>
  );
}
