"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getFirestoreErrorMessage,
  saveDailyBattlePlan,
  setDailyBattlePlanItemStatus,
  subscribeToDailyBattlePlan,
  type DailyBattlePlanInput
} from "@/lib/firebase/firestore";
import { getTodayDateKey } from "@/lib/date";
import type { BattlePlanItemStatus, DailyBattlePlan, DailyBattlePlanItem } from "@/types";

interface UseDailyBattlePlanResult {
  plan: DailyBattlePlan | null;
  pendingItems: DailyBattlePlanItem[];
  completedItems: DailyBattlePlanItem[];
  skippedItems: DailyBattlePlanItem[];
  loading: boolean;
  error: string | null;
  savePlan: (input: DailyBattlePlanInput) => Promise<string>;
  markItemStatus: (itemId: string, status: BattlePlanItemStatus) => Promise<void>;
  markDone: (itemId: string) => Promise<void>;
  skipItem: (itemId: string) => Promise<void>;
  reopenItem: (itemId: string) => Promise<void>;
}

export function useDailyBattlePlan(userId?: string | null, date = getTodayDateKey()): UseDailyBattlePlanResult {
  const [plan, setPlan] = useState<DailyBattlePlan | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setPlan(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      return subscribeToDailyBattlePlan(
        userId,
        date,
        (nextPlan) => {
          setPlan(nextPlan);
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
  }, [date, userId]);

  const savePlan = useCallback(
    async (input: DailyBattlePlanInput) => {
      if (!userId) {
        throw new Error("Login is required before saving a battle plan.");
      }

      return saveDailyBattlePlan(userId, input);
    },
    [userId]
  );

  const markItemStatus = useCallback(
    async (itemId: string, status: BattlePlanItemStatus) => {
      if (!plan) {
        throw new Error("Generate today's battle plan first.");
      }

      await setDailyBattlePlanItemStatus(plan.id, itemId, status);
    },
    [plan]
  );

  const markDone = useCallback((itemId: string) => markItemStatus(itemId, "Done"), [markItemStatus]);
  const skipItem = useCallback((itemId: string) => markItemStatus(itemId, "Skipped"), [markItemStatus]);
  const reopenItem = useCallback((itemId: string) => markItemStatus(itemId, "Pending"), [markItemStatus]);

  return {
    plan,
    pendingItems: plan?.items.filter((item) => item.status === "Pending") ?? [],
    completedItems: plan?.items.filter((item) => item.status === "Done") ?? [],
    skippedItems: plan?.items.filter((item) => item.status === "Skipped") ?? [],
    loading,
    error,
    savePlan,
    markItemStatus,
    markDone,
    skipItem,
    reopenItem
  };
}
