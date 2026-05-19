"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addStudyHabit,
  deleteStudyHabit,
  getFirestoreErrorMessage,
  setHabitCompletion,
  subscribeToHabitCompletions,
  subscribeToHabits,
  updateStudyHabit,
  type StudyHabitInput
} from "@/lib/firebase/firestore";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import { addDays, getDateKey, getTodayDateKey, getWeekDateKeys, parseDateKey } from "@/lib/date";
import type { HabitCompletion, StudyHabit } from "@/types";

export interface HabitWithStats extends StudyHabit {
  completedToday: boolean;
  streak: number;
  weeklyDates: { date: string; completed: boolean }[];
}

interface UseHabitsResult {
  habits: StudyHabit[];
  completions: HabitCompletion[];
  habitsWithStats: HabitWithStats[];
  completedToday: number;
  totalHabits: number;
  weeklyCompletionRate: number;
  loading: boolean;
  error: string | null;
  createHabit: (input: StudyHabitInput) => Promise<void>;
  saveHabit: (habitId: string, input: StudyHabitInput) => Promise<void>;
  toggleToday: (habitId: string, completed: boolean) => Promise<void>;
  removeHabit: (habitId: string) => Promise<void>;
}

function calculateStreak(completedDates: Set<string>): number {
  const today = getTodayDateKey();
  let cursor = completedDates.has(today) ? parseDateKey(today) : addDays(parseDateKey(today), -1);
  let streak = 0;

  while (completedDates.has(getDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export function useHabits(userId?: string | null): UseHabitsResult {
  const [habits, setHabits] = useState<StudyHabit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [loadingParts, setLoadingParts] = useState({
    habits: Boolean(userId),
    completions: Boolean(userId)
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setHabits([]);
      setLoadingParts((current) => ({ ...current, habits: false }));
      return;
    }

    const cacheKey = `habits:${userId}`;
    const cachedHabits = getClientCache<StudyHabit[]>(cacheKey);

    if (cachedHabits) {
      setHabits(cachedHabits);
      setLoadingParts((current) => ({ ...current, habits: false }));
    } else {
      setLoadingParts((current) => ({ ...current, habits: true }));
    }

    try {
      return subscribeToHabits(
        userId,
        (nextHabits) => {
          setClientCache(cacheKey, nextHabits);
          setHabits(nextHabits);
          setLoadingParts((current) => ({ ...current, habits: false }));
          setError(null);
        },
        (message) => {
          setError(message);
          setLoadingParts((current) => ({ ...current, habits: false }));
        }
      );
    } catch (currentError) {
      setError(getFirestoreErrorMessage(currentError));
      setLoadingParts((current) => ({ ...current, habits: false }));
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setCompletions([]);
      setLoadingParts((current) => ({ ...current, completions: false }));
      return;
    }

    const cacheKey = `habitCompletions:${userId}`;
    const cachedCompletions = getClientCache<HabitCompletion[]>(cacheKey);

    if (cachedCompletions) {
      setCompletions(cachedCompletions);
      setLoadingParts((current) => ({ ...current, completions: false }));
    } else {
      setLoadingParts((current) => ({ ...current, completions: true }));
    }

    try {
      return subscribeToHabitCompletions(
        userId,
        (nextCompletions) => {
          setClientCache(cacheKey, nextCompletions);
          setCompletions(nextCompletions);
          setLoadingParts((current) => ({ ...current, completions: false }));
          setError(null);
        },
        (message) => {
          setError(message);
          setLoadingParts((current) => ({ ...current, completions: false }));
        }
      );
    } catch (currentError) {
      setError(getFirestoreErrorMessage(currentError));
      setLoadingParts((current) => ({ ...current, completions: false }));
    }
  }, [userId]);

  const habitsWithStats = useMemo<HabitWithStats[]>(() => {
    const today = getTodayDateKey();
    const weekDates = getWeekDateKeys();

    return habits.map((habit) => {
      const habitCompletions = completions.filter((completion) => completion.habitId === habit.id);
      const completedDates = new Set(habitCompletions.map((completion) => completion.date));

      return {
        ...habit,
        completedToday: completedDates.has(today),
        streak: calculateStreak(completedDates),
        weeklyDates: weekDates.map((date) => ({
          date,
          completed: completedDates.has(date)
        }))
      };
    });
  }, [completions, habits]);

  const completedToday = habitsWithStats.filter((habit) => habit.completedToday).length;
  const weeklyCompletionRate = useMemo(() => {
    const weekDates = getWeekDateKeys();
    const possibleCompletions = habits.length * weekDates.length;
    const completedThisWeek = completions.filter((completion) => weekDates.includes(completion.date)).length;

    return possibleCompletions > 0 ? Math.round((completedThisWeek / possibleCompletions) * 100) : 0;
  }, [completions, habits.length]);

  const createHabit = useCallback(
    async (input: StudyHabitInput) => {
      if (!userId) {
        throw new Error("Login is required before creating habits.");
      }

      await addStudyHabit(userId, input);
    },
    [userId]
  );

  const saveHabit = useCallback(async (habitId: string, input: StudyHabitInput) => {
    await updateStudyHabit(habitId, input);
  }, []);

  const toggleToday = useCallback(
    async (habitId: string, completed: boolean) => {
      if (!userId) {
        throw new Error("Login is required before updating habits.");
      }

      await setHabitCompletion(userId, habitId, completed);
    },
    [userId]
  );

  const removeHabit = useCallback(
    async (habitId: string) => {
      if (!userId) {
        throw new Error("Login is required before deleting habits.");
      }

      await deleteStudyHabit(userId, habitId);
    },
    [userId]
  );

  return {
    habits,
    completions,
    habitsWithStats,
    completedToday,
    totalHabits: habits.length,
    weeklyCompletionRate,
    loading: Object.values(loadingParts).some(Boolean),
    error,
    createHabit,
    saveHabit,
    toggleToday,
    removeHabit
  };
}
