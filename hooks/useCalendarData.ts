"use client";

import { useEffect, useMemo, useState } from "react";
import { getDateKeysBetween, getMonthDateRange, getWeekDateKeys, getWeekDateRange } from "@/lib/date";
import {
  getSessionsByDateRange,
  getFirestoreErrorMessage,
  getTasksByDateRange
} from "@/lib/firebase/firestore";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import { groupPlannerEventsByDate, normalizePlannerEvents, type PlannerEvent } from "@/lib/plannerEvents";
import { useAssignments } from "@/hooks/useAssignments";
import { useBacklogItems } from "@/hooks/useBacklogItems";
import { useExamSchedules } from "@/hooks/useExamSchedules";
import { useReminders } from "@/hooks/useReminders";
import { useRevisions } from "@/hooks/useRevisions";
import { useSyllabus } from "@/hooks/useSyllabus";
import { useTimetable } from "@/hooks/useTimetable";
import type { DayActivity, StudySession, StudyTask } from "@/types";

interface UseCalendarDataResult {
  tasks: StudyTask[];
  sessions: StudySession[];
  activitiesByDate: Record<string, DayActivity>;
  plannerEvents: PlannerEvent[];
  plannerEventsByDate: Record<string, PlannerEvent[]>;
  monthPlannerEvents: PlannerEvent[];
  weekPlannerEvents: PlannerEvent[];
  monthDateKeys: string[];
  weekDateKeys: string[];
  subjects: ReturnType<typeof useSyllabus>["subjects"];
  loading: boolean;
  error: string | null;
}

function getCalendarRange(visibleMonth: Date, visibleWeek: Date): { start: string; end: string } {
  const monthRange = getMonthDateRange(visibleMonth);
  const weekRange = getWeekDateRange(visibleWeek);

  return {
    start: monthRange.start < weekRange.start ? monthRange.start : weekRange.start,
    end: monthRange.end > weekRange.end ? monthRange.end : weekRange.end
  };
}

export function useCalendarData(
  userId?: string | null,
  visibleMonth = new Date(),
  visibleWeek = visibleMonth
): UseCalendarDataResult {
  const [monthRange, setMonthRange] = useState(() => getMonthDateRange(visibleMonth));
  const [{ start, end }, setRange] = useState(() => getCalendarRange(visibleMonth, visibleWeek));
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [tasksLoading, setTasksLoading] = useState(Boolean(userId));
  const [sessionsLoading, setSessionsLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const syllabus = useSyllabus(userId);
  const timetable = useTimetable(userId);
  const assignments = useAssignments(userId);
  const backlog = useBacklogItems(userId);
  const exams = useExamSchedules(userId);
  const revisions = useRevisions(userId);
  const reminders = useReminders(userId);

  useEffect(() => {
    setMonthRange(getMonthDateRange(visibleMonth));
    setRange(getCalendarRange(visibleMonth, visibleWeek));
  }, [visibleMonth, visibleWeek]);

  useEffect(() => {
    if (!userId) {
      setTasks([]);
      setTasksLoading(false);
      return;
    }

    const cacheKey = `calendar:tasks:${userId}:${start}:${end}`;
    const cachedTasks = getClientCache<StudyTask[]>(cacheKey);
    let cancelled = false;

    if (cachedTasks) {
      setTasks(cachedTasks);
      setTasksLoading(false);
    } else {
      setTasksLoading(true);
    }

    getTasksByDateRange(userId, start, end)
      .then((nextTasks) => {
        if (!cancelled) {
          setClientCache(cacheKey, nextTasks);
          setTasks(nextTasks);
          setTasksLoading(false);
          setError(null);
        }
      })
      .catch((currentError) => {
        if (!cancelled) {
          setError(getFirestoreErrorMessage(currentError));
          setTasksLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [end, start, userId]);

  useEffect(() => {
    if (!userId) {
      setSessions([]);
      setSessionsLoading(false);
      return;
    }

    const cacheKey = `calendar:sessions:${userId}:${start}:${end}`;
    const cachedSessions = getClientCache<StudySession[]>(cacheKey);
    let cancelled = false;

    if (cachedSessions) {
      setSessions(cachedSessions);
      setSessionsLoading(false);
    } else {
      setSessionsLoading(true);
    }

    getSessionsByDateRange(userId, start, end)
      .then((nextSessions) => {
        if (!cancelled) {
          setClientCache(cacheKey, nextSessions);
          setSessions(nextSessions);
          setSessionsLoading(false);
          setError(null);
        }
      })
      .catch((currentError) => {
        if (!cancelled) {
          setError(getFirestoreErrorMessage(currentError));
          setSessionsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [end, start, userId]);

  const monthDateKeys = useMemo(() => getDateKeysBetween(monthRange.start, monthRange.end), [monthRange.end, monthRange.start]);
  const weekDateKeys = useMemo(() => getWeekDateKeys(visibleWeek), [visibleWeek]);
  const plannerDateKeys = useMemo(() => getDateKeysBetween(start, end), [end, start]);

  const activitiesByDate = useMemo(() => {
    const activities: Record<string, DayActivity> = {};

    for (const date of plannerDateKeys) {
      const daySessions = sessions.filter((session) => session.date === date);
      const completedTasks = tasks.filter((task) => task.date === date && task.completed);

      activities[date] = {
        date,
        sessions: daySessions,
        completedTasks,
        studyMinutes: daySessions.reduce(
          (total, session) => total + (session.status === "abandoned" ? 0 : session.actualDuration ?? session.duration),
          0
        )
      };
    }

    return activities;
  }, [plannerDateKeys, sessions, tasks]);

  const plannerEvents = useMemo(
    () => normalizePlannerEvents({
      dateKeys: plannerDateKeys,
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
      plannerDateKeys,
      reminders.reminders,
      revisions.plans,
      syllabus.subjects,
      timetable.blocks,
      timetable.scheduleContext
    ]
  );
  const plannerEventsByDate = useMemo(() => groupPlannerEventsByDate(plannerEvents), [plannerEvents]);
  const monthDateKeySet = useMemo(() => new Set(monthDateKeys), [monthDateKeys]);
  const weekDateKeySet = useMemo(() => new Set(weekDateKeys), [weekDateKeys]);
  const monthPlannerEvents = useMemo(
    () => plannerEvents.filter((event) => monthDateKeySet.has(event.date)),
    [monthDateKeySet, plannerEvents]
  );
  const weekPlannerEvents = useMemo(
    () => plannerEvents.filter((event) => weekDateKeySet.has(event.date)),
    [plannerEvents, weekDateKeySet]
  );

  return {
    tasks,
    sessions,
    activitiesByDate,
    plannerEvents,
    plannerEventsByDate,
    monthPlannerEvents,
    weekPlannerEvents,
    monthDateKeys,
    weekDateKeys,
    subjects: syllabus.subjects,
    loading:
      tasksLoading ||
      sessionsLoading ||
      syllabus.loading ||
      timetable.loading ||
      assignments.loading ||
      backlog.loading ||
      exams.loading ||
      revisions.loading ||
      reminders.loading,
    error: error ?? syllabus.error ?? timetable.error ?? assignments.error ?? backlog.error ?? exams.error ?? revisions.error ?? reminders.error
  };
}
