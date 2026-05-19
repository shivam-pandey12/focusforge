"use client";

import { useMemo } from "react";
import { useHabits } from "@/hooks/useHabits";
import { useRevisions } from "@/hooks/useRevisions";
import { useSyllabus } from "@/hooks/useSyllabus";
import { useTimetable } from "@/hooks/useTimetable";
import type { TimetableBlock } from "@/types";

interface UseDashboardSummariesResult {
  nextBlock: TimetableBlock | null;
  revisionsDue: number;
  revisionsOverdue: number;
  syllabusProgress: number;
  habitsCompletedToday: number;
  totalHabits: number;
  loading: boolean;
  error: string | null;
}

export function useDashboardSummaries(userId?: string | null): UseDashboardSummariesResult {
  const timetable = useTimetable(userId);
  const revisions = useRevisions(userId);
  const syllabus = useSyllabus(userId);
  const habits = useHabits(userId);

  return useMemo(
    () => ({
      nextBlock: timetable.nextBlock,
      revisionsDue: revisions.dueToday.length,
      revisionsOverdue: revisions.overdue.length,
      syllabusProgress: syllabus.overallProgress,
      habitsCompletedToday: habits.completedToday,
      totalHabits: habits.totalHabits,
      loading: timetable.loading || revisions.loading || syllabus.loading || habits.loading,
      error: timetable.error ?? revisions.error ?? syllabus.error ?? habits.error
    }),
    [
      habits.completedToday,
      habits.error,
      habits.loading,
      habits.totalHabits,
      revisions.dueToday.length,
      revisions.error,
      revisions.loading,
      revisions.overdue.length,
      syllabus.error,
      syllabus.loading,
      syllabus.overallProgress,
      timetable.error,
      timetable.loading,
      timetable.nextBlock
    ]
  );
}
