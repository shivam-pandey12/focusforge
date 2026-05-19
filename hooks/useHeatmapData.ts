"use client";

import { useEffect, useMemo, useState } from "react";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import { addDays, getDateKey, getTodayDateKey, parseDateKey } from "@/lib/date";
import {
  getSessionsByDateRange,
  getFirestoreErrorMessage,
} from "@/lib/firebase/firestore";
import { buildHeatmapDays, calculateBestSessionStreak } from "@/lib/phase5";
import { useStreak } from "@/hooks/useStreak";
import type { HeatmapDay, StudySession } from "@/types";

interface UseHeatmapDataResult {
  days: HeatmapDay[];
  sessions: StudySession[];
  currentStreak: number;
  bestStreak: number;
  totalMinutes: number;
  loading: boolean;
  error: string | null;
}

export function useHeatmapData(userId?: string | null, daysToShow = 365): UseHeatmapDataResult {
  const today = getTodayDateKey();
  const startDate = getDateKey(addDays(parseDateKey(today), -(daysToShow - 1)));
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const streak = useStreak(userId);

  useEffect(() => {
    if (!userId) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const cacheKey = `heatmap:sessions:${userId}:${startDate}:${today}`;
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
  }, [startDate, today, userId]);

  const heatmapDays = useMemo(() => buildHeatmapDays(sessions, daysToShow), [daysToShow, sessions]);

  return {
    days: heatmapDays,
    sessions,
    currentStreak: streak.currentStreak,
    bestStreak: Math.max(streak.longestStreak, calculateBestSessionStreak(sessions)),
    totalMinutes: sessions.reduce((total, session) => total + session.duration, 0),
    loading: loading || streak.loading,
    error: error ?? streak.error
  };
}
