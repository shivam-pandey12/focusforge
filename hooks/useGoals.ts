"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import {
  addStudyGoal,
  deleteStudyGoal,
  getFirestoreErrorMessage,
  READ_LIMITS,
  subscribeToStudyGoals,
  updateStudyGoal,
  type StudyGoalInput
} from "@/lib/firebase/firestore";
import { calculateGoalProgress, type GoalProgress } from "@/lib/phase5";
import { useAllTasks } from "@/hooks/useAllTasks";
import { useHabits } from "@/hooks/useHabits";
import { useMockTests } from "@/hooks/useMockTests";
import { useSyllabus } from "@/hooks/useSyllabus";
import { useUserSessions } from "@/hooks/useUserSessions";
import type { StudyGoal } from "@/types";

export interface StudyGoalWithProgress extends StudyGoal {
  progress: GoalProgress;
}

interface UseGoalsResult {
  goals: StudyGoal[];
  goalsWithProgress: StudyGoalWithProgress[];
  activeGoals: StudyGoalWithProgress[];
  completedGoals: StudyGoalWithProgress[];
  overdueGoals: StudyGoalWithProgress[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  createGoal: (input: StudyGoalInput) => Promise<void>;
  saveGoal: (goalId: string, input: StudyGoalInput) => Promise<void>;
  removeGoal: (goalId: string) => Promise<void>;
}

export function useGoals(userId?: string | null): UseGoalsResult {
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(READ_LIMITS.goalsPage);
  const tasks = useAllTasks(userId);
  const sessions = useUserSessions(userId);
  const syllabus = useSyllabus(userId);
  const habits = useHabits(userId);
  const mockTests = useMockTests(userId);

  useEffect(() => {
    if (!userId) {
      setGoals([]);
      setLoading(false);
      return;
    }

    const cacheKey = `studyGoals:${userId}:${pageSize}`;
    const cachedGoals = getClientCache<StudyGoal[]>(cacheKey);

    if (cachedGoals) {
      setGoals(cachedGoals);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      return subscribeToStudyGoals(
        userId,
        (nextGoals) => {
          setClientCache(cacheKey, nextGoals);
          setGoals(nextGoals);
          setLoading(false);
          setError(null);
        },
        (message) => {
          setError(message);
          setLoading(false);
        },
        pageSize
      );
    } catch (currentError) {
      setError(getFirestoreErrorMessage(currentError));
      setLoading(false);
    }
  }, [pageSize, userId]);

  const loadMore = useCallback(() => {
    setPageSize((currentSize) => currentSize + READ_LIMITS.goalsPage);
  }, []);

  const goalsWithProgress = useMemo<StudyGoalWithProgress[]>(() => {
    const context = {
      sessions: sessions.sessions,
      tasks: tasks.tasks,
      subjects: syllabus.subjects,
      chapters: syllabus.chapters,
      topics: syllabus.topics,
      mockTests: mockTests.tests,
      habits: habits.habits,
      habitCompletions: habits.completions
    };

    return goals.map((goal) => ({
      ...goal,
      progress: calculateGoalProgress(goal, context)
    }));
  }, [
    goals,
    habits.completions,
    habits.habits,
    mockTests.tests,
    sessions.sessions,
    syllabus.chapters,
    syllabus.subjects,
    syllabus.topics,
    tasks.tasks
  ]);

  const createGoal = useCallback(
    async (input: StudyGoalInput) => {
      if (!userId) {
        throw new Error("Login is required before adding goals.");
      }

      await addStudyGoal(userId, input);
    },
    [userId]
  );

  const saveGoal = useCallback(async (goalId: string, input: StudyGoalInput) => {
    await updateStudyGoal(goalId, input);
  }, []);

  const removeGoal = useCallback(async (goalId: string) => {
    await deleteStudyGoal(goalId);
  }, []);

  return {
    goals,
    goalsWithProgress,
    activeGoals: goalsWithProgress.filter((goal) => goal.progress.status === "active"),
    completedGoals: goalsWithProgress.filter((goal) => goal.progress.status === "completed"),
    overdueGoals: goalsWithProgress.filter((goal) => goal.progress.status === "overdue"),
    loading: loading || tasks.loading || sessions.loading || syllabus.loading || habits.loading || mockTests.loading,
    error: error ?? tasks.error ?? sessions.error ?? syllabus.error ?? habits.error ?? mockTests.error,
    hasMore: goals.length >= pageSize,
    loadMore,
    createGoal,
    saveGoal,
    removeGoal
  };
}
