"use client";

import { useMemo } from "react";
import { calculateProductivityScore } from "@/lib/phase5";
import { useAllTasks } from "@/hooks/useAllTasks";
import { useHabits } from "@/hooks/useHabits";
import { useRevisions } from "@/hooks/useRevisions";
import { useStreak } from "@/hooks/useStreak";
import { useUserSessions } from "@/hooks/useUserSessions";
import type { ProductivityScore } from "@/types";

interface UseProductivityScoreResult {
  productivity: ProductivityScore;
  loading: boolean;
  error: string | null;
}

export function useProductivityScore(userId?: string | null): UseProductivityScoreResult {
  const sessions = useUserSessions(userId);
  const tasks = useAllTasks(userId);
  const habits = useHabits(userId);
  const revisions = useRevisions(userId);
  const streak = useStreak(userId);

  const productivity = useMemo(
    () =>
      calculateProductivityScore({
        sessions: sessions.sessions,
        tasks: tasks.tasks,
        habits: habits.habits,
        habitCompletions: habits.completions,
        revisions: revisions.plans,
        streak: streak.streak
      }),
    [habits.completions, habits.habits, revisions.plans, sessions.sessions, streak.streak, tasks.tasks]
  );

  return {
    productivity,
    loading: sessions.loading || tasks.loading || habits.loading || revisions.loading || streak.loading,
    error: sessions.error ?? tasks.error ?? habits.error ?? revisions.error ?? streak.error
  };
}
