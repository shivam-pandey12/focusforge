import Link from "next/link";
import { getPlanDefinition, type PlanTier } from "@/lib/plans";

interface UpgradePromptProps {
  requiredPlan: PlanTier;
  title?: string;
  description: string;
  compact?: boolean;
}

export default function UpgradePrompt({ requiredPlan, title, description, compact = false }: UpgradePromptProps) {
  const plan = getPlanDefinition(requiredPlan);

  return (
    <div className={compact ? "upgrade-prompt upgrade-prompt-compact" : "upgrade-prompt"}>
      <div>
        <p className="eyebrow">{plan.displayName}</p>
        <h3 className="mt-2 text-xl font-bold text-forge-text">{title ?? "Upgrade when you are ready"}</h3>
        <p className="mt-2 text-base leading-7 text-forge-muted">{description}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link className="btn-primary" href="/pricing">View Plans</Link>
        <Link className="btn-secondary" href="/settings/billing">Billing</Link>
      </div>
    </div>
  );
}
