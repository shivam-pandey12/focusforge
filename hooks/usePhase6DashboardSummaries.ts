"use client";

import { useMemo } from "react";
import { getDateKeysBetween, getDayName, getWeekDateRange, parseDateKey } from "@/lib/date";
import { generateDailyBattlePlanItems } from "@/lib/battlePlan";
import { useAssignments } from "@/hooks/useAssignments";
import { useBacklogItems } from "@/hooks/useBacklogItems";
import { useDailyReview } from "@/hooks/useDailyReview";
import { useDailyBattlePlan } from "@/hooks/useDailyBattlePlan";
import { useExamSchedules } from "@/hooks/useExamSchedules";
import { useMarksEntries } from "@/hooks/useMarksEntries";
import { useProductivityScore } from "@/hooks/useProductivityScore";
import { useReminders } from "@/hooks/useReminders";
import { useRevisions } from "@/hooks/useRevisions";
import { useSessions } from "@/hooks/useSessions";
import { useSyllabus } from "@/hooks/useSyllabus";
import { useTimetable } from "@/hooks/useTimetable";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserSessions } from "@/hooks/useUserSessions";
import type { DailyBattlePlanItem } from "@/types";

interface UsePhase6DashboardSummariesResult {
  dailyTargetMinutes: number;
  targetProgress: number;
  preferredFocusDuration: number;
  dailyReviewDone: boolean;
  unreadReminders: number;
  weeklyStudyMinutes: number;
  completedSessionsThisWeek: number;
  abandonedSessionsThisWeek: number;
  bestFocusDay: string | null;
  productivityScore: number;
  backlogActiveCount: number;
  heavyBacklogCount: number;
  backlogClearedThisWeek: number;
  battlePlanItems: DailyBattlePlanItem[];
  battlePlanSaved: boolean;
  battlePlanAvailableMinutes: number;
  weakFocusTitle: string | null;
  weakFocusDetail: string | null;
  loading: boolean;
  error: string | null;
}

export function usePhase6DashboardSummaries(userId?: string | null): UsePhase6DashboardSummariesResult {
  const profile = useUserProfile(userId);
  const todaySessions = useSessions(userId);
  const allSessions = useUserSessions(userId);
  const dailyReview = useDailyReview(userId);
  const reminders = useReminders(userId);
  const productivity = useProductivityScore(userId);
  const syllabus = useSyllabus(userId);
  const assignments = useAssignments(userId);
  const exams = useExamSchedules(userId);
  const revisions = useRevisions(userId);
  const backlog = useBacklogItems(userId);
  const marks = useMarksEntries(userId, { subjects: syllabus.subjects });
  const timetable = useTimetable(userId);
  const battlePlan = useDailyBattlePlan(userId);

  return useMemo(() => {
    const weekRange = getWeekDateRange();
    const weekDates = getDateKeysBetween(weekRange.start, weekRange.end);
    const dailyTargetMinutes = profile.profile?.dailyStudyTargetMinutes ?? 120;
    const weeklySessions = allSessions.sessions.filter((session) => weekDates.includes(session.date));
    const completedWeeklySessions = weeklySessions.filter((session) => session.status !== "abandoned");
    const weeklyStudyMinutes = completedWeeklySessions.reduce(
      (total, session) => total + (session.actualDuration ?? session.duration),
      0
    );
    const minutesByDate = completedWeeklySessions.reduce<Record<string, number>>((totals, session) => {
      totals[session.date] = (totals[session.date] ?? 0) + (session.actualDuration ?? session.duration);
      return totals;
    }, {});
    const bestDate = Object.entries(minutesByDate).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const savedBattlePlanItems = battlePlan.plan?.items ?? [];
    const generatedBattlePlanItems = savedBattlePlanItems.length > 0
      ? savedBattlePlanItems
      : generateDailyBattlePlanItems({
        availableMinutes: dailyTargetMinutes,
        maxItems: 3,
        subjects: syllabus.subjects,
        chapters: syllabus.chapters,
        topics: syllabus.topics,
        assignments: assignments.assignments,
        exams: exams.exams,
        revisions: revisions.plans,
        backlogItems: backlog.items,
        marksSummary: marks.summary,
        sessions: allSessions.sessions,
        todayBlocks: timetable.todayBlocks
      });
    const weakestSubject = marks.summary.weakestSubject?.weak ? marks.summary.weakestSubject : null;
    const topWeakTopic = syllabus.topics.find((topic) => topic.status === "Weak" || topic.status === "Backlog");

    return {
      dailyTargetMinutes,
      targetProgress: dailyTargetMinutes > 0 ? Math.round((todaySessions.totalStudyTimeToday / dailyTargetMinutes) * 100) : 0,
      preferredFocusDuration: profile.profile?.preferredFocusDuration ?? 25,
      dailyReviewDone: Boolean(dailyReview.currentReview),
      unreadReminders: reminders.unreadCount,
      weeklyStudyMinutes,
      completedSessionsThisWeek: completedWeeklySessions.length,
      abandonedSessionsThisWeek: weeklySessions.filter((session) => session.status === "abandoned").length,
      bestFocusDay: bestDate ? getDayName(parseDateKey(bestDate).getDay()) : null,
      productivityScore: productivity.productivity.score,
      backlogActiveCount: backlog.activeItems.length,
      heavyBacklogCount: backlog.heavyCount,
      backlogClearedThisWeek: backlog.clearedThisWeek,
      battlePlanItems: generatedBattlePlanItems.slice(0, 3),
      battlePlanSaved: Boolean(battlePlan.plan),
      battlePlanAvailableMinutes: battlePlan.plan?.availableMinutes ?? dailyTargetMinutes,
      weakFocusTitle: weakestSubject?.subjectName ?? topWeakTopic?.name ?? null,
      weakFocusDetail: weakestSubject
        ? `${weakestSubject.averagePercentage}% average${weakestSubject.topMistakeTag ? ` / ${weakestSubject.topMistakeTag}` : ""}`
        : topWeakTopic ? `Topic status: ${topWeakTopic.status}` : null,
      loading:
        profile.loading ||
        todaySessions.loading ||
        allSessions.loading ||
        dailyReview.loading ||
        reminders.loading ||
        productivity.loading ||
        syllabus.loading ||
        assignments.loading ||
        exams.loading ||
        revisions.loading ||
        backlog.loading ||
        marks.loading ||
        timetable.loading ||
        battlePlan.loading,
      error:
        profile.error ??
        todaySessions.error ??
        allSessions.error ??
        dailyReview.error ??
        reminders.error ??
        productivity.error ??
        syllabus.error ??
        assignments.error ??
        exams.error ??
        revisions.error ??
        backlog.error ??
        marks.error ??
        timetable.error ??
        battlePlan.error
    };
  }, [
    allSessions.error,
    allSessions.loading,
    allSessions.sessions,
    assignments.assignments,
    assignments.error,
    assignments.loading,
    backlog.activeItems.length,
    backlog.clearedThisWeek,
    backlog.error,
    backlog.heavyCount,
    backlog.items,
    backlog.loading,
    battlePlan.error,
    battlePlan.loading,
    battlePlan.plan,
    dailyReview.currentReview,
    dailyReview.error,
    dailyReview.loading,
    exams.error,
    exams.exams,
    exams.loading,
    marks.error,
    marks.loading,
    marks.summary,
    productivity.error,
    productivity.loading,
    productivity.productivity.score,
    profile.error,
    profile.loading,
    profile.profile,
    reminders.error,
    reminders.loading,
    reminders.unreadCount,
    revisions.error,
    revisions.loading,
    revisions.plans,
    syllabus.chapters,
    syllabus.error,
    syllabus.loading,
    syllabus.subjects,
    syllabus.topics,
    timetable.error,
    timetable.loading,
    timetable.todayBlocks,
    todaySessions.error,
    todaySessions.loading,
    todaySessions.totalStudyTimeToday
  ]);
}
