"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addStudyTask,
  deleteStudyTask,
  getFirestoreErrorMessage,
  markStudyTaskCompleted,
  subscribeToTodayTasks
} from "@/lib/firebase/firestore";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import type { StudyTask } from "@/types";

interface UseTasksResult {
  tasks: StudyTask[];
  incompleteTasks: StudyTask[];
  loading: boolean;
  error: string | null;
  addTask: (title: string, duration: number, subject?: string) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
}

export function useTasks(userId?: string | null): UseTasksResult {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const cacheKey = `tasks:today:${userId}`;
    const cachedTasks = getClientCache<StudyTask[]>(cacheKey);

    if (cachedTasks) {
      setTasks(cachedTasks);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const unsubscribe = subscribeToTodayTasks(
        userId,
        (nextTasks) => {
          setClientCache(cacheKey, nextTasks);
          setTasks(nextTasks);
          setLoading(false);
          setError(null);
        },
        (message) => {
          setError(message);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (currentError) {
      setError(getFirestoreErrorMessage(currentError));
      setLoading(false);
    }
  }, [userId]);

  const incompleteTasks = useMemo(
    () => tasks.filter((task) => !task.completed),
    [tasks]
  );

  const addTask = useCallback(
    async (title: string, duration: number, subject?: string) => {
      if (!userId) {
        throw new Error("Login is required before adding a task.");
      }

      await addStudyTask(userId, title, duration, subject);
    },
    [userId]
  );

  const completeTask = useCallback(async (taskId: string) => {
    await markStudyTaskCompleted(taskId);
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    await deleteStudyTask(taskId);
  }, []);

  return {
    tasks,
    incompleteTasks,
    loading,
    error,
    addTask,
    completeTask,
    deleteTask
  };
}
