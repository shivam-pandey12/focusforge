import { FEATURE_LABELS, getRequiredPlan, type FeatureKey } from "@/lib/plans";
import UpgradePrompt from "@/components/UpgradePrompt";

interface FeatureLockedCardProps {
  feature: FeatureKey;
  title?: string;
  description?: string;
}

export default function FeatureLockedCard({ feature, title, description }: FeatureLockedCardProps) {
  const requiredPlan = getRequiredPlan(feature);
  const label = FEATURE_LABELS[feature];

  return (
    <section className="feature-locked-card">
      <div className="feature-locked-orb" aria-hidden="true" />
      <div className="relative z-10">
        <p className="eyebrow">Premium access</p>
        <h2 className="mt-3 text-3xl font-bold text-forge-text">{title ?? `${label} is locked`}</h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-forge-muted">
          {description ??
            `${label} is part of a higher FocusForge plan. Your existing data stays safe and can be unlocked again whenever you upgrade.`}
        </p>
        <p className="mt-3 inline-flex rounded-full border border-forge-line bg-white/80 px-3 py-1 text-sm font-bold text-forge-muted">
          Included in {requiredPlan === "pro" ? "Forge Pro and Elite" : "Forge Elite"}
        </p>
        <div className="mt-6">
          <UpgradePrompt
            compact
            requiredPlan={requiredPlan}
            description={`Upgrade to ${requiredPlan === "pro" ? "Forge Pro" : "Forge Elite"} to use ${label.toLowerCase()}. Your existing data is not deleted if your plan changes.`}
          />
        </div>
      </div>
    </section>
  );
}
