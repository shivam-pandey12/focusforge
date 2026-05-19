"use client";

import { useMemo } from "react";
import { getPlanDefinition, getPlanLimit, getPlanLimits, getStoredPlan, getUserPlan, isPlanExpired, type FeatureKey, type PlanLimits } from "@/lib/plans";
import { useUserProfile } from "@/hooks/useUserProfile";

export function usePlan(userId?: string | null) {
  const profile = useUserProfile(userId);
  const plan = getUserPlan(profile.profile);
  const storedPlan = getStoredPlan(profile.profile);
  const expired = isPlanExpired(profile.profile);

  return useMemo(
    () => ({
      ...profile,
      plan,
      storedPlan,
      expired,
      definition: getPlanDefinition(plan),
      limits: getPlanLimits(plan),
      hasFeature: (feature: FeatureKey) => getPlanDefinition(plan).features.includes(feature),
      getLimit: (limit: keyof PlanLimits) => getPlanLimit(plan, limit)
    }),
    [expired, plan, profile, storedPlan]
  );
}
