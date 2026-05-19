"use client";

import { useMemo } from "react";
import { getTodayDateKey } from "@/lib/date";
import { useGoals } from "@/hooks/useGoals";
import { useJournal } from "@/hooks/useJournal";
import { useMockTests } from "@/hooks/useMockTests";
import { usePlan } from "@/hooks/usePlan";
import { useProductivityScore } from "@/hooks/useProductivityScore";
import { useSessions } from "@/hooks/useSessions";
import { useWeakAreas } from "@/hooks/useWeakAreas";
import type { MockTestResult, StudyJournalEntry, WeakAreaInsight } from "@/types";
import type { MockAnalyticsSummary } from "@/lib/mockAnalytics";
import type { StudyGoalWithProgress } from "@/hooks/useGoals";

interface UsePhase5DashboardSummariesResult {
  productivityScore: number;
  topWeakArea: WeakAreaInsight | null;
  nearestGoal: StudyGoalWithProgress | null;
  recentMockTest: MockTestResult | null;
  mockSummary: MockAnalyticsSummary;
  journalPrompt: boolean;
  recentJournal: StudyJournalEntry | null;
  loading: boolean;
  error: string | null;
}

export function usePhase5DashboardSummaries(userId?: string | null): UsePhase5DashboardSummariesResult {
  const productivity = useProductivityScore(userId);
  const weakAreas = useWeakAreas(userId);
  const goals = useGoals(userId);
  const plan = usePlan(userId);
  const canMockTests = plan.hasFeature("mockTests") && plan.hasFeature("advancedMockAnalytics");
  const mockTests = useMockTests(canMockTests ? userId : undefined);
  const journal = useJournal(userId);
  const sessions = useSessions(userId);

  return useMemo(() => {
    const today = getTodayDateKey();
    const todayJournal = journal.entries.find((entry) => entry.date === today);
    const nearestGoal = [...goals.activeGoals, ...goals.overdueGoals].sort((a, b) =>
      a.targetDate.localeCompare(b.targetDate)
    )[0] ?? null;

    return {
      productivityScore: productivity.productivity.score,
      topWeakArea: weakAreas.topWeakArea,
      nearestGoal,
      recentMockTest: mockTests.tests[0] ?? null,
      mockSummary: mockTests.summary,
      journalPrompt: sessions.sessionsToday > 0 && !todayJournal,
      recentJournal: journal.entries[0] ?? null,
      loading:
        productivity.loading ||
        weakAreas.loading ||
        goals.loading ||
        plan.loading ||
        mockTests.loading ||
        journal.loading ||
        sessions.loading,
      error:
        productivity.error ??
        weakAreas.error ??
        goals.error ??
        plan.error ??
        mockTests.error ??
        journal.error ??
        sessions.error
    };
  }, [
    goals.activeGoals,
    goals.error,
    goals.loading,
    goals.overdueGoals,
    journal.entries,
    journal.error,
    journal.loading,
    mockTests.error,
    mockTests.loading,
    mockTests.summary,
    mockTests.tests,
    plan.error,
    plan.loading,
    productivity.error,
    productivity.loading,
    productivity.productivity.score,
    sessions.error,
    sessions.loading,
    sessions.sessionsToday,
    weakAreas.error,
    weakAreas.loading,
    weakAreas.topWeakArea
  ]);
}
