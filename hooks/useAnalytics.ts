"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  getDateKeysBetween,
  getDateKey,
  getMonthDateRange,
  parseDateKey,
  getTodayDateKey,
  getWeekDateRange
} from "@/lib/date";
import {
  getSessionsByDateRange,
  getFirestoreErrorMessage,
  subscribeToStreak,
  getTasksByDateRange
} from "@/lib/firebase/firestore";
import { getClientCache, hasClientCache, setClientCache } from "@/lib/clientCache";
import type { StudySession, StudyStreak, StudyTask } from "@/types";

interface BreakdownItem {
  label: string;
  minutes: number;
}

interface UseAnalyticsResult {
  weeklyStudyTime: number;
  monthlyStudyTime: number;
  averageDailyStudyTime: number;
  longestStreak: number;
  bestStudyDay: { date: string; minutes: number } | null;
  sessionsThisWeek: number;
  taskCompletionRate: number;
  taskBreakdown: BreakdownItem[];
  subjectBreakdown: BreakdownItem[];
  weeklyBars: { date: string; minutes: number }[];
  loading: boolean;
  error: string | null;
}

function groupMinutesByLabel(sessions: StudySession[], getLabel: (session: StudySession) => string): BreakdownItem[] {
  const grouped = sessions.reduce<Record<string, number>>((items, session) => {
    const label = getLabel(session);
    items[label] = (items[label] ?? 0) + session.duration;

    return items;
  }, {});

  return Object.entries(grouped)
    .map(([label, minutes]) => ({ label, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 6);
}

export function useAnalytics(userId?: string | null, historyDays = 31): UseAnalyticsResult {
  const weekRange = useMemo(() => getWeekDateRange(), []);
  const today = getTodayDateKey();
  const monthRange = useMemo(() => {
    if (!Number.isFinite(historyDays) || historyDays > 31) {
      return getMonthDateRange();
    }

    const safeDays = Math.max(1, Math.floor(historyDays));
    return {
      start: getDateKey(addDays(parseDateKey(today), -(safeDays - 1))),
      end: today
    };
  }, [historyDays, today]);
  const [weeklySessions, setWeeklySessions] = useState<StudySession[]>([]);
  const [monthlySessions, setMonthlySessions] = useState<StudySession[]>([]);
  const [monthlyTasks, setMonthlyTasks] = useState<StudyTask[]>([]);
  const [streak, setStreak] = useState<StudyStreak | null>(null);
  const [loadingParts, setLoadingParts] = useState({
    week: Boolean(userId),
    monthSessions: Boolean(userId),
    monthTasks: Boolean(userId),
    streak: Boolean(userId)
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setWeeklySessions([]);
      setLoadingParts((current) => ({ ...current, week: false }));
      return;
    }

    const cacheKey = `analytics:weekSessions:${userId}:${weekRange.start}:${weekRange.end}`;
    const cachedSessions = getClientCache<StudySession[]>(cacheKey);
    let cancelled = false;

    if (cachedSessions) {
      setWeeklySessions(cachedSessions);
      setLoadingParts((current) => ({ ...current, week: false }));
    } else {
      setLoadingParts((current) => ({ ...current, week: true }));
    }

    getSessionsByDateRange(userId, weekRange.start, weekRange.end)
      .then((sessions) => {
        if (!cancelled) {
          setClientCache(cacheKey, sessions);
          setWeeklySessions(sessions);
          setLoadingParts((current) => ({ ...current, week: false }));
          setError(null);
        }
      })
      .catch((currentError) => {
        if (!cancelled) {
          setError(getFirestoreErrorMessage(currentError));
          setLoadingParts((current) => ({ ...current, week: false }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId, weekRange.end, weekRange.start]);

  useEffect(() => {
    if (!userId) {
      setMonthlySessions([]);
      setLoadingParts((current) => ({ ...current, monthSessions: false }));
      return;
    }

    const cacheKey = `analytics:monthSessions:${userId}:${monthRange.start}:${monthRange.end}`;
    const cachedSessions = getClientCache<StudySession[]>(cacheKey);
    let cancelled = false;

    if (cachedSessions) {
      setMonthlySessions(cachedSessions);
      setLoadingParts((current) => ({ ...current, monthSessions: false }));
    } else {
      setLoadingParts((current) => ({ ...current, monthSessions: true }));
    }

    getSessionsByDateRange(userId, monthRange.start, monthRange.end)
      .then((sessions) => {
        if (!cancelled) {
          setClientCache(cacheKey, sessions);
          setMonthlySessions(sessions);
          setLoadingParts((current) => ({ ...current, monthSessions: false }));
          setError(null);
        }
      })
      .catch((currentError) => {
        if (!cancelled) {
          setError(getFirestoreErrorMessage(currentError));
          setLoadingParts((current) => ({ ...current, monthSessions: false }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [monthRange.end, monthRange.start, userId]);

  useEffect(() => {
    if (!userId) {
      setMonthlyTasks([]);
      setLoadingParts((current) => ({ ...current, monthTasks: false }));
      return;
    }

    const cacheKey = `analytics:monthTasks:${userId}:${monthRange.start}:${monthRange.end}`;
    const cachedTasks = getClientCache<StudyTask[]>(cacheKey);
    let cancelled = false;

    if (cachedTasks) {
      setMonthlyTasks(cachedTasks);
      setLoadingParts((current) => ({ ...current, monthTasks: false }));
    } else {
      setLoadingParts((current) => ({ ...current, monthTasks: true }));
    }

    getTasksByDateRange(userId, monthRange.start, monthRange.end)
      .then((tasks) => {
        if (!cancelled) {
          setClientCache(cacheKey, tasks);
          setMonthlyTasks(tasks);
          setLoadingParts((current) => ({ ...current, monthTasks: false }));
          setError(null);
        }
      })
      .catch((currentError) => {
        if (!cancelled) {
          setError(getFirestoreErrorMessage(currentError));
          setLoadingParts((current) => ({ ...current, monthTasks: false }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [monthRange.end, monthRange.start, userId]);

  useEffect(() => {
    if (!userId) {
      setStreak(null);
      setLoadingParts((current) => ({ ...current, streak: false }));
      return;
    }

    const cacheKey = `streak:${userId}`;

    if (hasClientCache(cacheKey)) {
      setStreak(getClientCache<StudyStreak | null>(cacheKey));
      setLoadingParts((current) => ({ ...current, streak: false }));
    } else {
      setLoadingParts((current) => ({ ...current, streak: true }));
    }

    try {
      return subscribeToStreak(
        userId,
        (nextStreak) => {
          setClientCache(cacheKey, nextStreak);
          setStreak(nextStreak);
          setLoadingParts((current) => ({ ...current, streak: false }));
          setError(null);
        },
        (message) => {
          setError(message);
          setLoadingParts((current) => ({ ...current, streak: false }));
        }
      );
    } catch (currentError) {
      setError(getFirestoreErrorMessage(currentError));
      setLoadingParts((current) => ({ ...current, streak: false }));
    }
  }, [userId]);

  return useMemo(() => {
    const weeklyStudyTime = weeklySessions.reduce((total, session) => total + session.duration, 0);
    const monthlyStudyTime = monthlySessions.reduce((total, session) => total + session.duration, 0);
    const monthSoFar = getDateKeysBetween(monthRange.start, today < monthRange.end ? today : monthRange.end);
    const bestStudyDay =
      getDateKeysBetween(monthRange.start, monthRange.end)
        .map((date) => ({
          date,
          minutes: monthlySessions
            .filter((session) => session.date === date)
            .reduce((total, session) => total + session.duration, 0)
        }))
        .sort((a, b) => b.minutes - a.minutes)[0] ?? null;
    const weeklyBars = getDateKeysBetween(weekRange.start, weekRange.end).map((date) => ({
      date,
      minutes: weeklySessions
        .filter((session) => session.date === date)
        .reduce((total, session) => total + session.duration, 0)
    }));
    const completedTasks = monthlyTasks.filter((task) => task.completed).length;
    const taskCompletionRate =
      monthlyTasks.length > 0 ? Math.round((completedTasks / monthlyTasks.length) * 100) : 0;

    return {
      weeklyStudyTime,
      monthlyStudyTime,
      averageDailyStudyTime: monthSoFar.length > 0 ? Math.round(monthlyStudyTime / monthSoFar.length) : 0,
      longestStreak: streak?.longestStreak ?? streak?.currentStreak ?? 0,
      bestStudyDay: bestStudyDay && bestStudyDay.minutes > 0 ? bestStudyDay : null,
      sessionsThisWeek: weeklySessions.length,
      taskCompletionRate,
      taskBreakdown: groupMinutesByLabel(monthlySessions, (session) => session.taskTitle || "Untitled task"),
      subjectBreakdown: groupMinutesByLabel(monthlySessions, (session) => session.subject || "Unsorted"),
      weeklyBars,
      loading: Object.values(loadingParts).some(Boolean),
      error
    };
  }, [
    error,
    loadingParts,
    monthRange.end,
    monthRange.start,
    monthlySessions,
    monthlyTasks,
    streak,
    today,
    weekRange.end,
    weekRange.start,
    weeklySessions
  ]);
}
