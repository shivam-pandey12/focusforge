import { type PlanTier } from "@/lib/plans";

interface PlanBadgeProps {
  plan: PlanTier;
  className?: string;
}

const PLAN_LABELS: Record<PlanTier, string> = {
  free: "Starter",
  pro: "Pro",
  elite: "Elite"
};

export default function PlanBadge({ plan, className = "" }: PlanBadgeProps) {
  return (
    <span className={`plan-badge plan-badge-${plan} ${className}`.trim()}>
      {PLAN_LABELS[plan]}
    </span>
  );
}
