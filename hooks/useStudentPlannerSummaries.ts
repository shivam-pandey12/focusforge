"use client";

import { useMemo } from "react";
import { useAssignments } from "@/hooks/useAssignments";
import { useBacklogItems } from "@/hooks/useBacklogItems";
import { useExamSchedules } from "@/hooks/useExamSchedules";
import { useReminders } from "@/hooks/useReminders";
import { useRevisions } from "@/hooks/useRevisions";
import { useSyllabus } from "@/hooks/useSyllabus";
import { useTimetable } from "@/hooks/useTimetable";
import { getDateKey, getTodayDateKey, getWeekDateKeys } from "@/lib/date";
import { normalizePlannerEvents, sortPlannerEvents, type PlannerEvent } from "@/lib/plannerEvents";
import type { TimetableScheduleContext } from "@/lib/timetable";
import type { ExamSchedule, RevisionPlan, StudyAssignment, SyllabusSubject, TimetableBlock } from "@/types";

interface UseStudentPlannerSummariesResult {
  subjects: SyllabusSubject[];
  todayClasses: TimetableBlock[];
  todayEvents: PlannerEvent[];
  nextClass: TimetableBlock | null;
  scheduleContext: TimetableScheduleContext;
  pendingAssignments: StudyAssignment[];
  overdueAssignments: StudyAssignment[];
  highPriorityAssignments: StudyAssignment[];
  upcomingAssignments: StudyAssignment[];
  upcomingExams: ExamSchedule[];
  nearestExam: ExamSchedule | null;
  dueRevisions: RevisionPlan[];
  overdueRevisions: RevisionPlan[];
  weeklyEvents: PlannerEvent[];
  weeklyStats: {
    classes: number;
    homework: number;
    exams: number;
    revision: number;
    backlog: number;
    completedAssignments: number;
  };
  loading: boolean;
  error: string | null;
}

function getCompletedDateKey(assignment: StudyAssignment): string | null {
  const completedAt = assignment.completedAt;

  if (completedAt && typeof completedAt.toDate === "function") {
    return getDateKey(completedAt.toDate());
  }

  return null;
}

export function useStudentPlannerSummaries(userId?: string | null): UseStudentPlannerSummariesResult {
  const syllabus = useSyllabus(userId);
  const timetable = useTimetable(userId);
  const assignments = useAssignments(userId);
  const backlog = useBacklogItems(userId);
  const exams = useExamSchedules(userId);
  const reminders = useReminders(userId);
  const revisions = useRevisions(userId);
  const today = getTodayDateKey();
  const weekDateKeys = useMemo(() => getWeekDateKeys(), []);
  const weekDateKeySet = useMemo(() => new Set(weekDateKeys), [weekDateKeys]);
  const weeklyEvents = useMemo(
    () => normalizePlannerEvents({
      dateKeys: weekDateKeys,
      subjects: syllabus.subjects,
      timetableBlocks: timetable.blocks,
      assignments: assignments.assignments,
      exams: exams.exams,
      revisions: revisions.plans,
      backlogItems: backlog.items,
      reminders: reminders.reminders,
      scheduleContext: timetable.scheduleContext
    }),
    [
      assignments.assignments,
      backlog.items,
      exams.exams,
      reminders.reminders,
      revisions.plans,
      syllabus.subjects,
      timetable.blocks,
      timetable.scheduleContext,
      weekDateKeys
    ]
  );
  const todayEvents = useMemo(
    () => sortPlannerEvents(weeklyEvents.filter((event) => event.date === today)),
    [today, weeklyEvents]
  );
  const highPriorityAssignments = useMemo(
    () => assignments.pendingAssignments.filter((assignment) => assignment.priority === "High"),
    [assignments.pendingAssignments]
  );
  const weeklyStats = useMemo(() => {
    const completedAssignments = assignments.assignments.filter((assignment) => {
      if (assignment.status !== "Completed") {
        return false;
      }

      const completedDateKey = getCompletedDateKey(assignment);

      return weekDateKeySet.has(completedDateKey ?? assignment.dueDate);
    }).length;

    return {
      classes: weeklyEvents.filter((event) => event.type === "class").length,
      homework: weeklyEvents.filter((event) => event.type === "homework").length,
      exams: weeklyEvents.filter((event) => event.type === "exam").length,
      revision: weeklyEvents.filter((event) => event.type === "revision").length,
      backlog: weeklyEvents.filter((event) => event.type === "backlog").length,
      completedAssignments
    };
  }, [assignments.assignments, weekDateKeySet, weeklyEvents]);

  return useMemo(
    () => ({
      subjects: syllabus.subjects,
      todayClasses: timetable.todayBlocks,
      todayEvents,
      nextClass: timetable.nextBlock,
      scheduleContext: timetable.scheduleContext,
      pendingAssignments: assignments.pendingAssignments,
      overdueAssignments: assignments.overdueAssignments,
      highPriorityAssignments,
      upcomingAssignments: assignments.upcomingAssignments,
      upcomingExams: exams.upcomingExams,
      nearestExam: exams.nearestExam,
      dueRevisions: revisions.dueToday,
      overdueRevisions: revisions.overdue,
      weeklyEvents,
      weeklyStats,
      loading: syllabus.loading || timetable.loading || assignments.loading || backlog.loading || exams.loading || revisions.loading || reminders.loading,
      error: syllabus.error ?? timetable.error ?? assignments.error ?? backlog.error ?? exams.error ?? revisions.error ?? reminders.error
    }),
    [
      assignments.error,
      assignments.loading,
      assignments.overdueAssignments,
      assignments.pendingAssignments,
      assignments.upcomingAssignments,
      backlog.error,
      backlog.loading,
      exams.error,
      exams.loading,
      exams.nearestExam,
      exams.upcomingExams,
      revisions.dueToday,
      revisions.error,
      revisions.loading,
      revisions.overdue,
      syllabus.error,
      syllabus.loading,
      syllabus.subjects,
      timetable.error,
      timetable.loading,
      timetable.nextBlock,
      timetable.scheduleContext,
      timetable.todayBlocks,
      todayEvents,
      highPriorityAssignments,
      weeklyEvents,
      weeklyStats,
      reminders.error,
      reminders.loading
    ]
  );
}
