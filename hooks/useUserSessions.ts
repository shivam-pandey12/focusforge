"use client";

import { useEffect, useState } from "react";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import { addDays, getDateKey, getTodayDateKey, parseDateKey } from "@/lib/date";
import { getFirestoreErrorMessage, getSessionsByDateRange, READ_LIMITS } from "@/lib/firebase/firestore";
import type { StudySession } from "@/types";

interface UseUserSessionsResult {
  sessions: StudySession[];
  loading: boolean;
  error: string | null;
}

export function useUserSessions(userId?: string | null, historyDays: number = READ_LIMITS.recentSessions): UseUserSessionsResult {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const today = getTodayDateKey();
    const startDate = getDateKey(addDays(parseDateKey(today), -(Math.max(1, historyDays) - 1)));
    const cacheKey = `sessions:recent:${userId}:${startDate}:${today}`;
    const cachedSessions = getClientCache<StudySession[]>(cacheKey);
    let cancelled = false;

    if (cachedSessions) {
      setSessions(cachedSessions);
      setLoading(false);
    } else {
      setLoading(true);
    }

    getSessionsByDateRange(userId, startDate, today)
      .then((nextSessions) => {
        if (!cancelled) {
          setClientCache(cacheKey, nextSessions);
          setSessions(nextSessions);
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

  return { sessions, loading, error };
}
