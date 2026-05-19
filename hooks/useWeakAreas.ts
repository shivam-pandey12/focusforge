"use client";

import { useEffect, useMemo, useState } from "react";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import { addDays, getDateKey, getTodayDateKey, parseDateKey } from "@/lib/date";
import {
  getSessionsByDateRange,
  getFirestoreErrorMessage,
} from "@/lib/firebase/firestore";
import { detectWeakAreas } from "@/lib/phase5";
import { useAllTasks } from "@/hooks/useAllTasks";
import { useMockTests } from "@/hooks/useMockTests";
import { usePlan } from "@/hooks/usePlan";
import { useRevisions } from "@/hooks/useRevisions";
import { useSyllabus } from "@/hooks/useSyllabus";
import type { StudySession, WeakAreaInsight } from "@/types";

interface UseWeakAreasResult {
  weakAreas: WeakAreaInsight[];
  topWeakArea: WeakAreaInsight | null;
  loading: boolean;
  error: string | null;
}

export function useWeakAreas(userId?: string | null): UseWeakAreasResult {
  const syllabus = useSyllabus(userId);
  const revisions = useRevisions(userId);
  const plan = usePlan(userId);
  const canUseMockAnalytics = plan.hasFeature("mockTests") && plan.hasFeature("advancedMockAnalytics");
  const mockTests = useMockTests(canUseMockAnalytics ? userId : undefined);
  const tasks = useAllTasks(userId);
  const today = getTodayDateKey();
  const startDate = getDateKey(addDays(parseDateKey(today), -14));
  const [recentSessions, setRecentSessions] = useState<StudySession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(Boolean(userId));
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setRecentSessions([]);
      setSessionsLoading(false);
      return;
    }

    const cacheKey = `weakAreas:sessions:${userId}:${startDate}:${today}`;
    const cachedSessions = getClientCache<StudySession[]>(cacheKey);
    let cancelled = false;

    if (cachedSessions) {
      setRecentSessions(cachedSessions);
      setSessionsLoading(false);
    } else {
      setSessionsLoading(true);
    }

    getSessionsByDateRange(userId, startDate, today)
      .then((nextSessions) => {
        if (!cancelled) {
          setClientCache(cacheKey, nextSessions);
          setRecentSessions(nextSessions);
          setSessionsLoading(false);
          setSessionsError(null);
        }
      })
      .catch((currentError) => {
        if (!cancelled) {
          setSessionsError(getFirestoreErrorMessage(currentError));
          setSessionsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [startDate, today, userId]);

  const weakAreas = useMemo(
    () =>
      detectWeakAreas({
        subjects: syllabus.subjects,
        topics: syllabus.topics,
        revisions: revisions.plans,
        tasks: tasks.tasks,
        sessions: recentSessions,
        mockTests: mockTests.tests
      }),
    [mockTests.tests, recentSessions, revisions.plans, syllabus.subjects, syllabus.topics, tasks.tasks]
  );

  return {
    weakAreas,
    topWeakArea: weakAreas.find((area) => area.status === "Falling behind" || area.status === "Needs attention") ?? weakAreas[0] ?? null,
    loading: syllabus.loading || revisions.loading || plan.loading || mockTests.loading || tasks.loading || sessionsLoading,
    error: syllabus.error ?? revisions.error ?? plan.error ?? mockTests.error ?? tasks.error ?? sessionsError
  };
}
