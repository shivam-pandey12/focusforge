import {
  getTodayDateKey,
  minutesFromTime,
  parseDateKey
} from "@/lib/date";
import { getRevisionDueDate, getRevisionPriority, getRevisionStatus, getRevisionTopicLabel, getRevisionType } from "@/lib/revision";
import {
  getTimetableScheduleContext,
  getTimetableScheduleLabel,
  resolveTimetableBlocksForDate,
  type TimetableScheduleContext
} from "@/lib/timetable";
import type {
  AssignmentPriority,
  AssignmentStatus,
  BacklogItem,
  ExamSchedule,
  RevisionPlan,
  RevisionStatus,
  StudyAssignment,
  StudyReminder,
  SyllabusSubject,
  TimetableBlock
} from "@/types";

export type PlannerEventType = "class" | "homework" | "exam" | "reminder" | "revision" | "backlog" | "focus";
export type PlannerEventTypeFilter = "all" | "class" | "homework" | "exam" | "revision" | "backlog" | "reminder";
export type ExamTimingFilter = "all" | "upcoming" | "past";

export interface PlannerSubjectSnapshot {
  id?: string;
  name: string;
  color?: string;
  icon?: string;
}

export interface PlannerEvent<TSource = unknown> {
  id: string;
  sourceId: string;
  type: PlannerEventType;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  subjectId?: string;
  subjectName?: string;
  subjectSnapshot?: PlannerSubjectSnapshot;
  status?: AssignmentStatus | RevisionStatus | BacklogItem["status"] | "read" | "unread" | "Active" | "Done" | "Dismissed";
  priority?: AssignmentPriority;
  href: string;
  raw: TSource;
  meta?: string;
}

export interface PlannerEventFilters {
  type: PlannerEventTypeFilter;
  subjectId: string;
  homeworkStatus: "all" | AssignmentStatus | RevisionStatus | BacklogItem["status"];
  priority: "all" | AssignmentPriority;
  examTiming: ExamTimingFilter;
}

export interface PlannerEventInput {
  dateKeys: string[];
  subjects: SyllabusSubject[];
  timetableBlocks: TimetableBlock[];
  assignments: StudyAssignment[];
  exams: ExamSchedule[];
  revisions?: RevisionPlan[];
  backlogItems?: BacklogItem[];
  reminders?: StudyReminder[];
  scheduleContext?: TimetableScheduleContext;
}

export const DEFAULT_PLANNER_EVENT_FILTERS: PlannerEventFilters = {
  type: "all",
  subjectId: "",
  homeworkStatus: "all",
  priority: "all",
  examTiming: "all"
};

export const PLANNER_EVENT_LABELS: Record<PlannerEventTypeFilter, string> = {
  all: "All",
  class: "Classes",
  homework: "Homework",
  exam: "Exams",
  revision: "Revision",
  backlog: "Backlog",
  reminder: "Reminders"
};

const PRIORITY_WEIGHT: Record<AssignmentPriority, number> = {
  High: 0,
  Medium: 1,
  Low: 2
};

const TYPE_WEIGHT: Record<PlannerEventType, number> = {
  class: 0,
  exam: 1,
  homework: 2,
  backlog: 3,
  reminder: 4,
  revision: 5,
  focus: 6
};

function timeWeight(time?: string): number {
  if (!time) {
    return Number.POSITIVE_INFINITY;
  }

  const minutes = minutesFromTime(time);

  return Number.isFinite(minutes) ? minutes : Number.POSITIVE_INFINITY;
}

function priorityWeight(priority?: AssignmentPriority): number {
  return priority ? PRIORITY_WEIGHT[priority] : 3;
}

function normalizeText(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function findSubject(
  subjects: SyllabusSubject[],
  subjectId?: string,
  subjectName?: string
): SyllabusSubject | undefined {
  const byId = subjectId ? subjects.find((subject) => subject.id === subjectId) : undefined;

  if (byId) {
    return byId;
  }

  const normalizedName = normalizeText(subjectName);

  return normalizedName
    ? subjects.find((subject) => normalizeText(subject.name) === normalizedName)
    : undefined;
}

function getSubjectSnapshot(
  subjects: SyllabusSubject[],
  subjectId?: string,
  subjectName?: string
): PlannerSubjectSnapshot | undefined {
  const subject = findSubject(subjects, subjectId, subjectName);

  if (subject) {
    return {
      id: subject.id,
      name: subject.name,
      color: subject.color,
      icon: subject.icon
    };
  }

  const fallbackName = subjectName?.trim();

  return fallbackName ? { id: subjectId, name: fallbackName } : undefined;
}

function getSubjectName(
  subjects: SyllabusSubject[],
  subjectId?: string,
  subjectName?: string
): string | undefined {
  return getSubjectSnapshot(subjects, subjectId, subjectName)?.name;
}

function normalizeClassEvents(
  dateKeys: string[],
  subjects: SyllabusSubject[],
  timetableBlocks: TimetableBlock[],
  scheduleContext: TimetableScheduleContext
): PlannerEvent<TimetableBlock>[] {
  return dateKeys.flatMap((dateKey) => {
    return resolveTimetableBlocksForDate(timetableBlocks, dateKey, scheduleContext).map((block) => {
      const subjectSnapshot = getSubjectSnapshot(subjects, block.subjectId, block.subject);
      const subjectName = (subjectSnapshot?.name ?? block.subject) || "Study block";
      const title = block.title?.trim() || subjectName;
      const meta = [block.classType, getTimetableScheduleLabel(block), block.teacherName, block.location].filter(Boolean).join(" / ");

      return {
        id: `class:${block.id}:${dateKey}`,
        sourceId: block.id,
        type: "class" as const,
        title,
        date: dateKey,
        startTime: block.startTime,
        endTime: block.endTime,
        subjectId: subjectSnapshot?.id ?? block.subjectId,
        subjectName,
        subjectSnapshot,
        href: "/timetable",
        raw: block,
        meta
      };
    });
  });
}

function normalizeHomeworkEvents(
  dateKeySet: Set<string>,
  subjects: SyllabusSubject[],
  assignments: StudyAssignment[]
): PlannerEvent<StudyAssignment>[] {
  return assignments
    .filter((assignment) => dateKeySet.has(assignment.dueDate))
    .map((assignment) => {
      const subjectSnapshot = getSubjectSnapshot(subjects, assignment.subjectId, assignment.subject);

      return {
        id: `homework:${assignment.id}`,
        sourceId: assignment.id,
        type: "homework" as const,
        title: assignment.title,
        date: assignment.dueDate,
        subjectId: subjectSnapshot?.id ?? assignment.subjectId,
        subjectName: subjectSnapshot?.name ?? assignment.subject,
        subjectSnapshot,
        status: assignment.status,
        priority: assignment.priority,
        href: "/homework",
        raw: assignment,
        meta: `${assignment.priority} priority / ${assignment.status}`
      };
    });
}

function normalizeExamEvents(
  dateKeySet: Set<string>,
  subjects: SyllabusSubject[],
  exams: ExamSchedule[]
): PlannerEvent<ExamSchedule>[] {
  return exams
    .filter((exam) => dateKeySet.has(exam.date))
    .map((exam) => {
      const subjectSnapshot = exam.fullSyllabus
        ? undefined
        : getSubjectSnapshot(subjects, exam.subjectId, exam.subject);
      const subjectName = exam.fullSyllabus
        ? "Full syllabus"
        : getSubjectName(subjects, exam.subjectId, exam.subject);

      return {
        id: `exam:${exam.id}`,
        sourceId: exam.id,
        type: "exam" as const,
        title: exam.name,
        date: exam.date,
        startTime: exam.startTime,
        subjectId: subjectSnapshot?.id ?? exam.subjectId,
        subjectName,
        subjectSnapshot,
        href: "/exams",
        raw: exam,
        meta: [subjectName, exam.durationMinutes ? `${exam.durationMinutes}m` : "", exam.totalMarks ? `${exam.totalMarks} marks` : ""]
          .filter(Boolean)
          .join(" / ")
      };
    });
}

function normalizeReminderEvents(
  dateKeySet: Set<string>,
  subjects: SyllabusSubject[],
  reminders: StudyReminder[]
): PlannerEvent<StudyReminder>[] {
  return reminders
    .filter((reminder) => dateKeySet.has(reminder.date))
    .map((reminder) => {
      const subjectSnapshot = getSubjectSnapshot(subjects, reminder.subjectId, reminder.subject);

      return {
        id: `reminder:${reminder.id}`,
        sourceId: reminder.id,
        type: "reminder" as const,
        title: reminder.title,
        date: reminder.date,
        startTime: reminder.time,
        subjectId: subjectSnapshot?.id ?? reminder.subjectId,
        subjectName: subjectSnapshot?.name ?? reminder.subject,
        subjectSnapshot,
        status: reminder.status ?? (reminder.read ? "read" : "unread"),
        href: "/reminders",
        raw: reminder,
        meta: reminder.message || reminder.notes || reminder.type
      };
    });
}

function normalizeRevisionEvents(
  dateKeySet: Set<string>,
  subjects: SyllabusSubject[],
  revisions: RevisionPlan[]
): PlannerEvent<RevisionPlan>[] {
  return revisions
    .map((revision) => ({ revision, dueDate: getRevisionDueDate(revision) }))
    .filter(({ dueDate }) => dueDate && dateKeySet.has(dueDate))
    .map(({ revision, dueDate }) => {
      const subjectSnapshot = getSubjectSnapshot(subjects, revision.subjectId, revision.subject);
      const subjectName = subjectSnapshot?.name ?? revision.subject;
      const status = getRevisionStatus(revision);
      const priority = getRevisionPriority(revision);
      const topicLabel = getRevisionTopicLabel(revision);

      return {
        id: `revision:${revision.id}`,
        sourceId: revision.id,
        type: "revision" as const,
        title: revision.title,
        date: dueDate,
        subjectId: subjectSnapshot?.id ?? revision.subjectId,
        subjectName,
        subjectSnapshot,
        status,
        priority,
        href: "/revision",
        raw: revision,
        meta: [getRevisionType(revision), priority, status, topicLabel].filter(Boolean).join(" / ")
      };
    });
}

function normalizeBacklogEvents(
  dateKeySet: Set<string>,
  subjects: SyllabusSubject[],
  backlogItems: BacklogItem[]
): PlannerEvent<BacklogItem>[] {
  return backlogItems
    .filter((item) => item.status !== "Cleared" && item.targetFinishDate && dateKeySet.has(item.targetFinishDate))
    .map((item) => {
      const subjectSnapshot = getSubjectSnapshot(subjects, item.subjectId, item.subject);

      return {
        id: `backlog:${item.id}`,
        sourceId: item.id,
        type: "backlog" as const,
        title: item.title,
        date: item.targetFinishDate ?? "",
        subjectId: subjectSnapshot?.id ?? item.subjectId,
        subjectName: subjectSnapshot?.name ?? item.subject,
        subjectSnapshot,
        status: item.status,
        priority: item.priority,
        href: "/backlog",
        raw: item,
        meta: [item.backlogLevel, item.reason, item.status].filter(Boolean).join(" / ")
      };
    });
}

export function sortPlannerEvents<TEvent extends PlannerEvent>(events: TEvent[]): TEvent[] {
  return [...events].sort((a, b) => {
    const dateSort = a.date.localeCompare(b.date);

    if (dateSort !== 0) {
      return dateSort;
    }

    const timeSort = timeWeight(a.startTime) - timeWeight(b.startTime);

    if (timeSort !== 0) {
      return timeSort;
    }

    const prioritySort = priorityWeight(a.priority) - priorityWeight(b.priority);

    if (prioritySort !== 0) {
      return prioritySort;
    }

    return TYPE_WEIGHT[a.type] - TYPE_WEIGHT[b.type] || a.title.localeCompare(b.title);
  });
}

export function normalizePlannerEvents({
  dateKeys,
  subjects,
  timetableBlocks,
  assignments,
  exams,
  revisions = [],
  backlogItems = [],
  reminders = [],
  scheduleContext = getTimetableScheduleContext([])
}: PlannerEventInput): PlannerEvent[] {
  const uniqueDateKeys = [...new Set(dateKeys.filter(Boolean))].sort();
  const dateKeySet = new Set(uniqueDateKeys);

  return sortPlannerEvents([
    ...normalizeClassEvents(uniqueDateKeys, subjects, timetableBlocks, scheduleContext),
    ...normalizeHomeworkEvents(dateKeySet, subjects, assignments),
    ...normalizeExamEvents(dateKeySet, subjects, exams),
    ...normalizeRevisionEvents(dateKeySet, subjects, revisions),
    ...normalizeBacklogEvents(dateKeySet, subjects, backlogItems),
    ...normalizeReminderEvents(dateKeySet, subjects, reminders)
  ]);
}

export function groupPlannerEventsByDate(events: PlannerEvent[]): Record<string, PlannerEvent[]> {
  return events.reduce<Record<string, PlannerEvent[]>>((grouped, event) => {
    grouped[event.date] = grouped[event.date] ? [...grouped[event.date], event] : [event];
    return grouped;
  }, {});
}

export function filterPlannerEvents(
  events: PlannerEvent[],
  filters: PlannerEventFilters,
  today = getTodayDateKey()
): PlannerEvent[] {
  return sortPlannerEvents(
    events.filter((event) => {
      if (filters.type !== "all" && event.type !== filters.type) {
        return false;
      }

      if (filters.subjectId && event.subjectId !== filters.subjectId) {
        return false;
      }

      if (
        filters.homeworkStatus !== "all" &&
        (event.type === "homework" || event.type === "revision" || event.type === "backlog") &&
        event.status !== filters.homeworkStatus
      ) {
        return false;
      }

      if (
        filters.priority !== "all" &&
        (event.type === "homework" || event.type === "revision" || event.type === "backlog") &&
        event.priority !== filters.priority
      ) {
        return false;
      }

      if (filters.examTiming !== "all" && event.type === "exam") {
        const isPast = event.date < today;

        if ((filters.examTiming === "past" && !isPast) || (filters.examTiming === "upcoming" && isPast)) {
          return false;
        }
      }

      return true;
    })
  );
}

export function getEventTypeCounts(events: PlannerEvent[]): Record<PlannerEventTypeFilter, number> {
  return events.reduce<Record<PlannerEventTypeFilter, number>>(
    (counts, event) => {
      if (
        event.type === "class" ||
        event.type === "homework" ||
        event.type === "exam" ||
        event.type === "revision" ||
        event.type === "backlog" ||
        event.type === "reminder"
      ) {
        counts[event.type] += 1;
      }
      counts.all += 1;
      return counts;
    },
    { all: 0, class: 0, homework: 0, exam: 0, revision: 0, backlog: 0, reminder: 0 }
  );
}

export function getCountdownLabel(dateKey: string): string {
  const days = Math.round((parseDateKey(dateKey).getTime() - parseDateKey(getTodayDateKey()).getTime()) / 86400000);

  if (days === 0) {
    return "Today";
  }

  if (days === 1) {
    return "Tomorrow";
  }

  return days > 1 ? `${days} days left` : `${Math.abs(days)} days ago`;
}
