import type { MarksEntry, MarksEntryScope, MistakeTag, SyllabusSubject } from "@/types";

export const MARKS_ENTRY_SCOPES: MarksEntryScope[] = [
  "Subject Test",
  "Full Syllabus",
  "Chapter Test",
  "Practice Test",
  "School Exam",
  "Coaching Test",
  "Other"
];

export const MARKS_SCOPES_REQUIRING_SUBJECT: MarksEntryScope[] = [
  "Subject Test",
  "Chapter Test",
  "School Exam",
  "Coaching Test"
];

export const MISTAKE_TAGS: MistakeTag[] = [
  "Concept Error",
  "Calculation Mistake",
  "Silly Mistake",
  "Time Pressure",
  "Formula Forgotten",
  "Not Revised",
  "Guessed Wrong",
  "Skipped Questions",
  "Other"
];

export type MarksTrend = "Improving" | "Declining" | "Stable" | "Not enough data";

export interface SubjectMarksSummary {
  subjectId: string;
  subjectName: string;
  averagePercentage: number;
  totalTests: number;
  latestEntry: MarksEntry | null;
  topMistakeTag: MistakeTag | null;
  weak: boolean;
}

export interface MarksProgressSummary {
  totalTests: number;
  overallAverage: number;
  latestEntry: MarksEntry | null;
  bestSubject: SubjectMarksSummary | null;
  weakestSubject: SubjectMarksSummary | null;
  trend: MarksTrend;
  topMistakeTag: MistakeTag | null;
  subjectSummaries: SubjectMarksSummary[];
  mistakeTagCounts: Array<{ tag: MistakeTag; count: number }>;
  recentEntries: MarksEntry[];
}

export function calculateMarksPercentage(score: number, totalMarks: number): number {
  if (!Number.isFinite(score) || !Number.isFinite(totalMarks) || totalMarks <= 0) {
    return 0;
  }

  return Math.round((score / totalMarks) * 1000) / 10;
}

export function normalizeMarksEntryScope(value: unknown): MarksEntryScope {
  return MARKS_ENTRY_SCOPES.includes(value as MarksEntryScope) ? (value as MarksEntryScope) : "Subject Test";
}

export function normalizeMistakeTags(value: unknown): MistakeTag[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((tag): tag is MistakeTag => MISTAKE_TAGS.includes(tag as MistakeTag));
}

export function requiresSubjectForScope(scope: MarksEntryScope): boolean {
  return MARKS_SCOPES_REQUIRING_SUBJECT.includes(scope);
}

function average(entries: MarksEntry[]): number {
  if (entries.length === 0) {
    return 0;
  }

  return Math.round((entries.reduce((total, entry) => total + entry.percentage, 0) / entries.length) * 10) / 10;
}

function sortByRecent(entries: MarksEntry[]): MarksEntry[] {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.testName.localeCompare(a.testName));
}

function getTopMistakeTag(entries: MarksEntry[]): MistakeTag | null {
  const counts = new Map<MistakeTag, number>();

  entries.forEach((entry) => {
    entry.mistakeTags.forEach((tag) => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    });
  });

  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
}

function getTrend(entries: MarksEntry[]): MarksTrend {
  const dated = [...entries]
    .filter((entry) => entry.date)
    .sort((a, b) => a.date.localeCompare(b.date) || a.testName.localeCompare(b.testName));

  if (dated.length < 2) {
    return "Not enough data";
  }

  const previous = dated[dated.length - 2].percentage;
  const latest = dated[dated.length - 1].percentage;
  const diff = latest - previous;

  if (diff >= 2) {
    return "Improving";
  }

  if (diff <= -2) {
    return "Declining";
  }

  return "Stable";
}

export function summarizeMarksEntries(
  entries: MarksEntry[],
  subjects: SyllabusSubject[] = []
): MarksProgressSummary {
  const recentEntries = sortByRecent(entries);
  const subjectNames = new Map(subjects.map((subject) => [subject.id, subject.name]));
  const subjectTargets = new Map(subjects.map((subject) => [subject.id, subject.targetValue ?? null]));
  const bySubject = new Map<string, MarksEntry[]>();

  entries.forEach((entry) => {
    if (!entry.subjectId) {
      return;
    }

    const current = bySubject.get(entry.subjectId) ?? [];
    current.push(entry);
    bySubject.set(entry.subjectId, current);
  });

  const subjectSummaries = [...bySubject.entries()]
    .map<SubjectMarksSummary>(([subjectId, subjectEntries]) => {
      const sortedEntries = sortByRecent(subjectEntries);
      const averagePercentage = average(subjectEntries);
      const target = subjectTargets.get(subjectId);

      return {
        subjectId,
        subjectName: subjectNames.get(subjectId) ?? sortedEntries[0]?.subject ?? "Subject",
        averagePercentage,
        totalTests: subjectEntries.length,
        latestEntry: sortedEntries[0] ?? null,
        topMistakeTag: getTopMistakeTag(subjectEntries),
        weak: Number.isFinite(target ?? Number.NaN) ? averagePercentage < Number(target) : averagePercentage < 60
      };
    })
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName));

  const mistakeTagCounts = MISTAKE_TAGS
    .map((tag) => ({
      tag,
      count: entries.reduce((total, entry) => total + (entry.mistakeTags.includes(tag) ? 1 : 0), 0)
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  const bestSubject = [...subjectSummaries].sort((a, b) => b.averagePercentage - a.averagePercentage)[0] ?? null;
  const weakestSubject = [...subjectSummaries].sort((a, b) => a.averagePercentage - b.averagePercentage)[0] ?? null;

  return {
    totalTests: entries.length,
    overallAverage: average(entries),
    latestEntry: recentEntries[0] ?? null,
    bestSubject,
    weakestSubject,
    trend: getTrend(entries),
    topMistakeTag: mistakeTagCounts[0]?.tag ?? null,
    subjectSummaries,
    mistakeTagCounts,
    recentEntries
  };
}
