"use client";

import { useEffect, useState } from "react";
import { addDays, getDateKey, getTodayDateKey, parseDateKey } from "@/lib/date";
import { getFirestoreErrorMessage, getTasksByDateRange, READ_LIMITS } from "@/lib/firebase/firestore";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import type { StudyTask } from "@/types";

interface UseAllTasksResult {
  tasks: StudyTask[];
  loading: boolean;
  error: string | null;
}

export function useAllTasks(userId?: string | null, historyDays = READ_LIMITS.recentTasks): UseAllTasksResult {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const today = getTodayDateKey();
    const startDate = getDateKey(addDays(parseDateKey(today), -(Math.max(1, historyDays) - 1)));
    const cacheKey = `tasks:recent:${userId}:${startDate}:${today}`;
    const cachedTasks = getClientCache<StudyTask[]>(cacheKey);
    let cancelled = false;

    if (cachedTasks) {
      setTasks(cachedTasks);
      setLoading(false);
    } else {
      setLoading(true);
    }

    getTasksByDateRange(userId, startDate, today)
      .then((nextTasks) => {
        if (!cancelled) {
          setClientCache(cacheKey, nextTasks);
          setTasks(nextTasks);
          setLoading(false);
          setError(null);
        }
      })
      .catch((currentError) => {
        if (!cancelled) {
          setError(getFirestoreErrorMessage(currentError));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [historyDays, userId]);

  return { tasks, loading, error };
}
