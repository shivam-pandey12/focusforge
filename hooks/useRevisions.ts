"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addRevisionPlan,
  completeRevisionPlan,
  deleteRevisionPlan,
  finishRevisionPlan,
  getFirestoreErrorMessage,
  reopenRevisionPlan,
  skipRevisionPlan,
  subscribeToRevisionPlans,
  updateRevisionPlan,
  type RevisionPlanInput
} from "@/lib/firebase/firestore";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import { getTodayDateKey } from "@/lib/date";
import { getRevisionCompletedDate, getRevisionDueDate, getRevisionStatus, isRevisionActive } from "@/lib/revision";
import type { RevisionPlan } from "@/types";

interface RevisionBuckets {
  overdue: RevisionPlan[];
  dueToday: RevisionPlan[];
  upcoming: RevisionPlan[];
  completedToday: RevisionPlan[];
  finished: RevisionPlan[];
  skipped: RevisionPlan[];
}

interface UseRevisionsResult extends RevisionBuckets {
  plans: RevisionPlan[];
  loading: boolean;
  error: string | null;
  createPlan: (input: RevisionPlanInput) => Promise<void>;
  savePlan: (planId: string, input: RevisionPlanInput) => Promise<void>;
  completePlan: (planId: string) => Promise<void>;
  skipPlan: (planId: string) => Promise<void>;
  reopenPlan: (planId: string) => Promise<void>;
  finishPlan: (planId: string) => Promise<void>;
  removePlan: (planId: string) => Promise<void>;
}

export function useRevisions(userId?: string | null): UseRevisionsResult {
  const [plans, setPlans] = useState<RevisionPlan[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setPlans([]);
      setLoading(false);
      return;
    }

    const cacheKey = `revisions:${userId}`;
    const cachedPlans = getClientCache<RevisionPlan[]>(cacheKey);

    if (cachedPlans) {
      setPlans(cachedPlans);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      return subscribeToRevisionPlans(
        userId,
        (nextPlans) => {
          setClientCache(cacheKey, nextPlans);
          setPlans(nextPlans);
          setLoading(false);
          setError(null);
        },
        (message) => {
          setError(message);
          setLoading(false);
        }
      );
    } catch (currentError) {
      setError(getFirestoreErrorMessage(currentError));
      setLoading(false);
    }
  }, [userId]);

  const buckets = useMemo<RevisionBuckets>(() => {
    const today = getTodayDateKey();
    const activePlans = plans.filter(isRevisionActive);

    return {
      overdue: activePlans.filter((plan) => getRevisionDueDate(plan) < today),
      dueToday: activePlans.filter((plan) => getRevisionDueDate(plan) === today),
      upcoming: activePlans.filter((plan) => getRevisionDueDate(plan) > today),
      completedToday: plans.filter((plan) => getRevisionStatus(plan) === "Done" && getRevisionCompletedDate(plan) === today),
      finished: plans.filter((plan) => getRevisionStatus(plan) === "Done"),
      skipped: plans.filter((plan) => getRevisionStatus(plan) === "Skipped")
    };
  }, [plans]);

  const createPlan = useCallback(
    async (input: RevisionPlanInput) => {
      if (!userId) {
        throw new Error("Login is required before creating revision plans.");
      }

      await addRevisionPlan(userId, input);
    },
    [userId]
  );

  const savePlan = useCallback(async (planId: string, input: RevisionPlanInput) => {
    await updateRevisionPlan(planId, input);
  }, []);

  const completePlan = useCallback(
    async (planId: string) => {
      if (!userId) {
        throw new Error("Login is required before completing revisions.");
      }

      await completeRevisionPlan(planId, userId);
    },
    [userId]
  );

  const finishPlan = useCallback(async (planId: string) => {
    await finishRevisionPlan(planId);
  }, []);

  const skipPlan = useCallback(async (planId: string) => {
    await skipRevisionPlan(planId);
  }, []);

  const reopenPlan = useCallback(async (planId: string) => {
    await reopenRevisionPlan(planId);
  }, []);

  const removePlan = useCallback(async (planId: string) => {
    await deleteRevisionPlan(planId);
  }, []);

  return {
    plans,
    ...buckets,
    loading,
    error,
    createPlan,
    savePlan,
    completePlan,
    skipPlan,
    reopenPlan,
    finishPlan,
    removePlan
  };
}
