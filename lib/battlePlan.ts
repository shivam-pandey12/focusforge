import { getRevisionDueDate, getRevisionPriority, isRevisionActive } from "@/lib/revision";
import { getTodayDateKey, parseDateKey } from "@/lib/date";
import type { MarksProgressSummary } from "@/lib/marks";
import type { MockAnalyticsSummary } from "@/lib/mockAnalytics";
import type {
  AssignmentPriority,
  BacklogItem,
  DailyBattlePlan,
  DailyBattlePlanItem,
  ExamSchedule,
  RevisionPlan,
  StudyAssignment,
  StudySession,
  SyllabusChapter,
  SyllabusSubject,
  SyllabusTopic,
  TimetableBlock
} from "@/types";

export const AVAILABLE_STUDY_TIME_OPTIONS = [
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "3 hours", minutes: 180 }
] as const;

const PRIORITY_SCORE: Record<AssignmentPriority, number> = {
  High: 24,
  Medium: 12,
  Low: 4
};

const LEVEL_DURATION: Record<BacklogItem["backlogLevel"], number> = {
  Light: 30,
  Medium: 45,
  Heavy: 60
};

const LEVEL_SCORE: Record<BacklogItem["backlogLevel"], number> = {
  Light: 8,
  Medium: 18,
  Heavy: 30
};

export interface BattlePlanGenerationInput {
  date?: string;
  availableMinutes: number;
  maxItems: number;
  subjects: SyllabusSubject[];
  chapters: SyllabusChapter[];
  topics: SyllabusTopic[];
  assignments: StudyAssignment[];
  exams: ExamSchedule[];
  revisions: RevisionPlan[];
  backlogItems: BacklogItem[];
  marksSummary: MarksProgressSummary;
  mockAnalytics?: MockAnalyticsSummary;
  sessions: StudySession[];
  todayBlocks: TimetableBlock[];
  existingPlan?: DailyBattlePlan | null;
}

function daysUntil(dateKey: string, today: string): number {
  return Math.round((parseDateKey(dateKey).getTime() - parseDateKey(today).getTime()) / 86400000);
}

function subjectSnapshot(subjects: SyllabusSubject[], subjectId?: string, subjectName?: string) {
  const subject = subjectId ? subjects.find((item) => item.id === subjectId) : undefined;

  return {
    subjectId: subject?.id ?? subjectId,
    subject: subject?.name ?? subjectName,
    subjectColor: subject?.color,
    subjectIcon: subject?.icon
  };
}

function priorityFromScore(score: number): DailyBattlePlanItem["priority"] {
  if (score >= 70) {
    return "High";
  }

  if (score >= 35) {
    return "Medium";
  }

  return "Low";
}

function makeItem(
  item: Omit<DailyBattlePlanItem, "id" | "status" | "overflow" | "priority"> & {
    id?: string;
    priority?: DailyBattlePlanItem["priority"];
  }
): DailyBattlePlanItem {
  return {
    id: item.id ?? `${item.sourceType}:${item.sourceId ?? item.title}`.replace(/[^\w-]+/g, "-").toLowerCase(),
    title: item.title,
    type: item.type,
    subjectId: item.subjectId,
    subject: item.subject,
    subjectColor: item.subjectColor,
    subjectIcon: item.subjectIcon,
    recommendedDuration: Math.max(5, Math.round(item.recommendedDuration)),
    priority: item.priority ?? priorityFromScore(item.score),
    score: Math.round(item.score),
    reason: item.reason,
    suggestedAction: item.suggestedAction,
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    href: item.href,
    status: "Pending",
    overflow: false
  };
}

function pushDeduped(items: DailyBattlePlanItem[], seen: Set<string>, item: DailyBattlePlanItem) {
  const key = `${item.sourceType}:${item.sourceId || item.title}`;

  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  items.push(item);
}

function activeMinutesToday(sessions: StudySession[], date: string): number {
  return sessions
    .filter((session) => session.date === date && session.status !== "abandoned")
    .reduce((total, session) => total + (session.actualDuration ?? session.duration), 0);
}

function preserveExistingStatuses(items: DailyBattlePlanItem[], existingPlan?: DailyBattlePlan | null): DailyBattlePlanItem[] {
  if (!existingPlan) {
    return items;
  }

  const statusBySource = new Map(
    existingPlan.items.map((item) => [`${item.sourceType}:${item.sourceId || item.title}`, item.status])
  );

  return items.map((item) => ({
    ...item,
    status: statusBySource.get(`${item.sourceType}:${item.sourceId || item.title}`) ?? "Pending"
  }));
}

export function hasBattlePlanProgress(plan: DailyBattlePlan | null | undefined): boolean {
  return Boolean(plan?.items.some((item) => item.status === "Done" || item.status === "Skipped"));
}

export function generateDailyBattlePlanItems(input: BattlePlanGenerationInput): DailyBattlePlanItem[] {
  const today = input.date ?? getTodayDateKey();
  const seen = new Set<string>();
  const items: DailyBattlePlanItem[] = [];
  const minutesAlreadyStudied = activeMinutesToday(input.sessions, today);
  const freeMinutes = Math.max(0, input.availableMinutes - minutesAlreadyStudied);

  for (const assignment of input.assignments) {
    if (assignment.status === "Completed") {
      continue;
    }

    const days = daysUntil(assignment.dueDate, today);
    const urgency = days < 0 ? 55 : days === 0 ? 48 : days === 1 ? 34 : days <= 3 ? 22 : 8;
    const score = urgency + PRIORITY_SCORE[assignment.priority];

    pushDeduped(items, seen, makeItem({
      title: `${assignment.title}`,
      type: "Homework",
      ...subjectSnapshot(input.subjects, assignment.subjectId, assignment.subject),
      recommendedDuration: assignment.estimatedMinutes ?? 45,
      score,
      reason: days < 0 ? "Homework is overdue." : days === 0 ? "Homework is due today." : `Homework is due in ${days} day${days === 1 ? "" : "s"}.`,
      suggestedAction: "Finish the most urgent part first, then mark homework complete.",
      sourceType: "assignment",
      sourceId: assignment.id,
      href: "/homework"
    }));
  }

  for (const exam of input.exams) {
    const days = daysUntil(exam.date, today);

    if (days < 0 || days > 14) {
      continue;
    }

    const subject = exam.fullSyllabus ? { subject: "Full syllabus" } : subjectSnapshot(input.subjects, exam.subjectId, exam.subject);
    const score = days <= 1 ? 78 : days <= 3 ? 66 : days <= 7 ? 48 : 30;

    pushDeduped(items, seen, makeItem({
      title: `Prepare for ${exam.name}`,
      type: "Exam Prep",
      ...subject,
      recommendedDuration: days <= 3 ? 50 : 30,
      score,
      reason: days === 0 ? "Exam is today." : `Exam is ${days} day${days === 1 ? "" : "s"} away.`,
      suggestedAction: "Review syllabus notes and solve a short practice set.",
      sourceType: "exam",
      sourceId: exam.id,
      href: "/exams"
    }));
  }

  for (const revision of input.revisions.filter(isRevisionActive)) {
    const dueDate = getRevisionDueDate(revision);
    const days = daysUntil(dueDate, today);

    if (days > 7) {
      continue;
    }

    const priority = getRevisionPriority(revision);
    const score = (days < 0 ? 45 : days === 0 ? 36 : 16) + PRIORITY_SCORE[priority];

    pushDeduped(items, seen, makeItem({
      title: `Revise ${revision.title}`,
      type: "Revision",
      ...subjectSnapshot(input.subjects, revision.subjectId, revision.subject),
      recommendedDuration: 25,
      score,
      reason: days < 0 ? "Revision is overdue." : days === 0 ? "Revision is due today." : `Revision is due in ${days} day${days === 1 ? "" : "s"}.`,
      suggestedAction: "Revise the core notes, then do a quick recall check.",
      sourceType: "revision",
      sourceId: revision.id,
      href: "/revision"
    }));
  }

  for (const backlog of input.backlogItems) {
    if (backlog.status === "Cleared") {
      continue;
    }

    const targetDays = backlog.targetFinishDate ? daysUntil(backlog.targetFinishDate, today) : 99;
    const targetScore = targetDays < 0 ? 28 : targetDays <= 1 ? 22 : targetDays <= 3 ? 14 : 0;
    const statusScore = backlog.status === "In Progress" ? 8 : 0;
    const score = LEVEL_SCORE[backlog.backlogLevel] + PRIORITY_SCORE[backlog.priority] + targetScore + statusScore;

    pushDeduped(items, seen, makeItem({
      title: `Clear ${backlog.title}`,
      type: "Backlog",
      ...subjectSnapshot(input.subjects, backlog.subjectId, backlog.subject),
      recommendedDuration: backlog.estimatedMinutes ?? LEVEL_DURATION[backlog.backlogLevel],
      score,
      reason: `${backlog.backlogLevel} backlog from ${backlog.reason.toLowerCase()}${targetDays <= 3 ? " with a near target date" : ""}.`,
      suggestedAction: backlog.topicName ? "Study the topic and solve a small checkpoint set." : "Make one concrete dent and update backlog status.",
      sourceType: "backlog",
      sourceId: backlog.id,
      href: "/backlog"
    }));
  }

  for (const summary of input.marksSummary.subjectSummaries) {
    if (!summary.weak || summary.totalTests === 0) {
      continue;
    }

    const score = summary.averagePercentage < 50 ? 44 : 34;

    pushDeduped(items, seen, makeItem({
      title: `Practice weak subject: ${summary.subjectName}`,
      type: "Weak Topic",
      ...subjectSnapshot(input.subjects, summary.subjectId, summary.subjectName),
      recommendedDuration: 30,
      score,
      reason: `Subject average is ${summary.averagePercentage}%${summary.topMistakeTag ? `; common issue: ${summary.topMistakeTag}` : ""}.`,
      suggestedAction: "Review recent mistakes and solve a short mixed set.",
      sourceType: "marks",
      sourceId: summary.subjectId,
      href: "/marks"
    }));
  }

  if (input.mockAnalytics?.nextRepairSuggestion) {
    const suggestion = input.mockAnalytics.nextRepairSuggestion;

    pushDeduped(items, seen, makeItem({
      title: suggestion.title,
      type: suggestion.type === "Create Backlog" || suggestion.type === "Practice Weak Topic" ? "Weak Topic" : "Exam Prep",
      subjectId: suggestion.subjectId,
      subject: suggestion.subject,
      subjectColor: suggestion.subjectColor,
      subjectIcon: suggestion.subjectIcon,
      recommendedDuration: suggestion.recommendedDuration,
      score: suggestion.priority === "High" ? 38 : 30,
      reason: `Mock repair: ${suggestion.reason}`,
      suggestedAction: "Open the mock report, confirm the repair, then run a focused practice block.",
      sourceType: "mockTest",
      sourceId: suggestion.mockTestId,
      href: suggestion.href
    }));
  }

  for (const topic of input.topics) {
    if (topic.status !== "Weak" && topic.status !== "Backlog") {
      continue;
    }

    const chapter = input.chapters.find((item) => item.id === topic.chapterId);
    const subject = input.subjects.find((item) => item.id === topic.subjectId);

    pushDeduped(items, seen, makeItem({
      title: `${topic.status === "Backlog" ? "Backlog topic" : "Weak topic"}: ${topic.name}`,
      type: topic.status === "Backlog" ? "Backlog" : "Weak Topic",
      ...subjectSnapshot(input.subjects, topic.subjectId, subject?.name),
      recommendedDuration: 30,
      score: topic.status === "Backlog" ? 42 : 32,
      reason: `${topic.status} status from your syllabus tracker${chapter ? ` / ${chapter.name}` : ""}.`,
      suggestedAction: "Revise the concept and update topic status when it improves.",
      sourceType: "topic",
      sourceId: topic.id,
      href: "/topics"
    }));
  }

  if (items.length === 0 && input.todayBlocks.length > 0) {
    const firstBlock = input.todayBlocks[0];

    pushDeduped(items, seen, makeItem({
      title: `Prepare for ${firstBlock.subject}`,
      type: "General Study",
      ...subjectSnapshot(input.subjects, firstBlock.subjectId, firstBlock.subject),
      recommendedDuration: 25,
      score: 20,
      reason: "You have a class or study block today.",
      suggestedAction: "Preview the next class topic and note one question.",
      sourceType: "general",
      sourceId: firstBlock.id,
      href: "/timetable"
    }));
  }

  const sorted = items
    .map((item) => ({
      ...item,
      score: item.recommendedDuration <= Math.max(30, freeMinutes) ? item.score + 4 : item.score
    }))
    .sort((a, b) => b.score - a.score || a.recommendedDuration - b.recommendedDuration || a.title.localeCompare(b.title))
    .slice(0, Math.max(1, input.maxItems));

  let usedMinutes = 0;
  const withOverflow = sorted.map((item) => {
    usedMinutes += item.recommendedDuration;
    return {
      ...item,
      priority: priorityFromScore(item.score),
      overflow: usedMinutes > Math.max(30, freeMinutes)
    };
  });

  return preserveExistingStatuses(withOverflow, input.existingPlan);
}
