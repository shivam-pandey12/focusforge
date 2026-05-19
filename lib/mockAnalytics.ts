import type {
  AssignmentPriority,
  BacklogLevel,
  MockMistakeTag,
  MockPerformanceLevel,
  MockSubjectBreakdown,
  MockTestResult,
  RevisionType
} from "@/types";

export const MOCK_EXAM_TYPES = ["JEE Main", "JEE Advanced", "NEET", "Boards", "School", "Coaching", "Custom"] as const;
export const MOCK_PERFORMANCE_LEVELS = ["Strong", "Average", "Weak", "Critical"] as const;
export const MOCK_MISTAKE_TAGS: MockMistakeTag[] = [
  "Concept Error",
  "Calculation Mistake",
  "Silly Mistake",
  "Time Pressure",
  "Formula Forgotten",
  "Not Revised",
  "Guessed Wrong",
  "Skipped Questions",
  "Misread Question",
  "Overthinking",
  "Other"
];

export type MockTrend = "Improving" | "Declining" | "Stable" | "Not enough data";
export type MockSuggestionType =
  | "Create Revision"
  | "Create Backlog"
  | "Practice Weak Topic"
  | "Review Mistakes"
  | "Start Focus"
  | "Add to Battle Plan"
  | "Schedule Re-test";

export interface MockSubjectSummary {
  subjectId?: string;
  subject: string;
  subjectColor?: string;
  subjectIcon?: string;
  tests: number;
  averagePercentage: number;
  averageAccuracy: number;
  latestPercentage: number;
  weak: boolean;
  reason: string;
}

export interface MockWeakArea {
  id: string;
  subjectId?: string;
  subject: string;
  subjectColor?: string;
  subjectIcon?: string;
  chapterId?: string;
  chapterName?: string;
  topicId?: string;
  topicName?: string;
  performanceLevel: MockPerformanceLevel;
  mistakeTags: MockMistakeTag[];
  reason: string;
  source: "subject" | "topic" | "mistake" | "time";
}

export interface MockRepairSuggestion {
  id: string;
  type: MockSuggestionType;
  title: string;
  reason: string;
  subjectId?: string;
  subject?: string;
  subjectColor?: string;
  subjectIcon?: string;
  chapterId?: string;
  chapterName?: string;
  topicId?: string;
  topicName?: string;
  mistakeTags: MockMistakeTag[];
  recommendedDuration: number;
  priority: AssignmentPriority;
  backlogLevel: BacklogLevel;
  revisionType: RevisionType;
  mockTestId: string;
  href: string;
}

export interface MockAnalyticsSummary {
  totalMocks: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  latestMock: MockTestResult | null;
  scoreTrend: MockTrend;
  accuracyTrend: MockTrend;
  bestSubject: MockSubjectSummary | null;
  weakestSubject: MockSubjectSummary | null;
  biggestMistakeType: MockMistakeTag | null;
  repeatedWeakTopic: string | null;
  timePressureFrequency: number;
  subjectSummaries: MockSubjectSummary[];
  nextRepairSuggestion: MockRepairSuggestion | null;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function sortTests(tests: MockTestResult[]): MockTestResult[] {
  return [...tests].sort((a, b) => b.testDate.localeCompare(a.testDate) || b.title.localeCompare(a.title));
}

function trendFrom(values: number[]): MockTrend {
  if (values.length < 2) {
    return "Not enough data";
  }

  const [latest, previous] = values;
  const delta = latest - previous;

  if (delta >= 3) {
    return "Improving";
  }

  if (delta <= -3) {
    return "Declining";
  }

  return "Stable";
}

function subjectRowsForTest(test: MockTestResult): MockSubjectBreakdown[] {
  if (test.subjectBreakdowns.length > 0) {
    return test.subjectBreakdowns;
  }

  if (!test.subject) {
    return [];
  }

  return [{
    id: `${test.id}-overall`,
    subjectId: test.subjectId,
    subject: test.subject,
    subjectColor: test.subjectColor,
    subjectIcon: test.subjectIcon,
    score: test.score,
    totalMarks: test.totalMarks,
    percentage: test.percentage,
    attempted: test.attemptedQuestions,
    correct: test.correctAnswers,
    incorrect: test.wrongAnswers,
    skipped: test.skippedQuestions,
    accuracy: test.accuracy,
    timeSpentMinutes: test.timeTakenMinutes,
    notes: test.notes
  }];
}

function getMistakeCounts(tests: MockTestResult[]): Map<MockMistakeTag, number> {
  const counts = new Map<MockMistakeTag, number>();

  tests.forEach((test) => {
    [...test.mistakeTags, ...test.topicAnalyses.flatMap((item) => item.mistakeTags)].forEach((tag) => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    });
  });

  return counts;
}

function getTopMistakeTag(tests: MockTestResult[]): MockMistakeTag | null {
  return [...getMistakeCounts(tests).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
}

function weaknessReasonFromSubject(row: MockSubjectBreakdown): string | null {
  const reasons: string[] = [];

  if (row.percentage < 55) {
    reasons.push(`score was ${row.percentage}%`);
  }

  if (row.accuracy < 55 && row.attempted > 0) {
    reasons.push(`accuracy was ${row.accuracy}%`);
  }

  if (row.skipped >= Math.max(5, Math.round((row.attempted + row.skipped) * 0.35))) {
    reasons.push(`${row.skipped} questions were skipped`);
  }

  return reasons.length > 0 ? `${row.subject} is weak because ${reasons.join(" and ")}.` : null;
}

function performanceToBacklogLevel(level: MockPerformanceLevel): BacklogLevel {
  if (level === "Critical") {
    return "Heavy";
  }

  if (level === "Weak") {
    return "Medium";
  }

  return "Light";
}

function priorityForLevel(level: MockPerformanceLevel): AssignmentPriority {
  return level === "Critical" || level === "Weak" ? "High" : "Medium";
}

export function revisionTypeForMistake(tags: MockMistakeTag[]): RevisionType {
  if (tags.includes("Formula Forgotten")) {
    return "Formula";
  }

  if (tags.includes("Calculation Mistake") || tags.includes("Time Pressure")) {
    return "Question Practice";
  }

  if (tags.includes("Silly Mistake") || tags.includes("Misread Question") || tags.includes("Overthinking")) {
    return "Mistake Review";
  }

  if (tags.includes("Concept Error") || tags.includes("Not Revised")) {
    return "Theory";
  }

  return "Question Practice";
}

export function getMockWeakAreas(test: MockTestResult): MockWeakArea[] {
  const subjectAreas = subjectRowsForTest(test)
    .map((row) => ({ row, reason: weaknessReasonFromSubject(row) }))
    .filter((item): item is { row: MockSubjectBreakdown; reason: string } => Boolean(item.reason))
    .map(({ row, reason }) => ({
      id: `subject:${row.id}`,
      subjectId: row.subjectId,
      subject: row.subject,
      subjectColor: row.subjectColor,
      subjectIcon: row.subjectIcon,
      performanceLevel: row.percentage < 40 || row.accuracy < 40 ? "Critical" as const : "Weak" as const,
      mistakeTags: [] as MockMistakeTag[],
      reason,
      source: "subject" as const
    }));
  const topicAreas = test.topicAnalyses
    .filter((item) => item.performanceLevel === "Weak" || item.performanceLevel === "Critical")
    .map((item) => ({
      id: `topic:${item.id}`,
      subjectId: item.subjectId,
      subject: item.subject,
      subjectColor: item.subjectColor,
      subjectIcon: item.subjectIcon,
      chapterId: item.chapterId,
      chapterName: item.chapterName,
      topicId: item.topicId,
      topicName: item.topicName,
      performanceLevel: item.performanceLevel,
      mistakeTags: item.mistakeTags,
      reason: `${item.topicName || item.chapterName || item.subject} is ${item.performanceLevel.toLowerCase()}${item.mistakeTags.length > 0 ? ` due to ${item.mistakeTags.join(", ")}` : ""}.`,
      source: "topic" as const
    }));
  const timeAreas = test.timeAnalysis?.timePressure || test.mistakeTags.includes("Time Pressure")
    ? [{
      id: "time-pressure",
      subject: test.timeAnalysis?.slowSubject || test.subject || "Mock test",
      performanceLevel: "Weak" as const,
      mistakeTags: ["Time Pressure" as MockMistakeTag],
      reason: test.timeAnalysis?.slowSubject
        ? `${test.timeAnalysis.slowSubject} had time pressure in this mock.`
        : "Time pressure appeared in this mock.",
      source: "time" as const
    }]
    : [];

  return [...subjectAreas, ...topicAreas, ...timeAreas];
}

export function getMockRepairSuggestions(test: MockTestResult): MockRepairSuggestion[] {
  const weakAreas = getMockWeakAreas(test);
  const suggestions: MockRepairSuggestion[] = [];

  weakAreas.slice(0, 6).forEach((area, index) => {
    const topicLabel = area.topicName || area.chapterName || area.subject;
    const revisionType = revisionTypeForMistake(area.mistakeTags);
    const backlogLevel = performanceToBacklogLevel(area.performanceLevel);
    const priority = priorityForLevel(area.performanceLevel);

    suggestions.push({
      id: `repair:${test.id}:${area.id}:${index}`,
      type: area.source === "time" ? "Review Mistakes" : area.source === "topic" ? "Create Backlog" : "Practice Weak Topic",
      title: area.source === "time" ? "Review time pressure mistakes" : `Repair ${topicLabel}`,
      reason: area.reason,
      subjectId: area.subjectId,
      subject: area.subject,
      subjectColor: area.subjectColor,
      subjectIcon: area.subjectIcon,
      chapterId: area.chapterId,
      chapterName: area.chapterName,
      topicId: area.topicId,
      topicName: area.topicName,
      mistakeTags: area.mistakeTags,
      recommendedDuration: area.performanceLevel === "Critical" ? 45 : 25,
      priority,
      backlogLevel,
      revisionType,
      mockTestId: test.id,
      href: `/mock-tests/${test.id}`
    });
  });

  const topMistake = getTopMistakeTag([test]);

  if (topMistake) {
    suggestions.push({
      id: `mistake:${test.id}:${topMistake}`,
      type: "Create Revision",
      title: `Review ${topMistake} mistakes`,
      reason: `${topMistake} appeared in this mock and should be repaired before the next test.`,
      subjectId: test.subjectId,
      subject: test.subject,
      subjectColor: test.subjectColor,
      subjectIcon: test.subjectIcon,
      mistakeTags: [topMistake],
      recommendedDuration: 25,
      priority: topMistake === "Time Pressure" || topMistake === "Concept Error" ? "High" : "Medium",
      backlogLevel: "Medium",
      revisionType: revisionTypeForMistake([topMistake]),
      mockTestId: test.id,
      href: `/mock-tests/${test.id}`
    });
  }

  return suggestions;
}

export function calculateMockAnalytics(tests: MockTestResult[]): MockAnalyticsSummary {
  const sortedTests = sortTests(tests);
  const latestMock = sortedTests[0] ?? null;
  const totalMocks = sortedTests.length;
  const averageScore = totalMocks > 0 ? round(sortedTests.reduce((total, test) => total + test.percentage, 0) / totalMocks) : 0;
  const highestScore = totalMocks > 0 ? Math.max(...sortedTests.map((test) => test.percentage)) : 0;
  const lowestScore = totalMocks > 0 ? Math.min(...sortedTests.map((test) => test.percentage)) : 0;
  const subjectGroups = new Map<string, MockSubjectBreakdown[]>();

  sortedTests.forEach((test) => {
    subjectRowsForTest(test).forEach((row) => {
      const key = row.subjectId || row.subject.toLowerCase();
      subjectGroups.set(key, [...(subjectGroups.get(key) ?? []), row]);
    });
  });

  const subjectSummaries = [...subjectGroups.values()]
    .map((rows): MockSubjectSummary => {
      const latest = rows[0];
      const averagePercentage = round(rows.reduce((total, row) => total + row.percentage, 0) / rows.length);
      const averageAccuracy = round(rows.reduce((total, row) => total + row.accuracy, 0) / rows.length);
      const weak = averagePercentage < 60 || averageAccuracy < 60;

      return {
        subjectId: latest.subjectId,
        subject: latest.subject,
        subjectColor: latest.subjectColor,
        subjectIcon: latest.subjectIcon,
        tests: rows.length,
        averagePercentage,
        averageAccuracy,
        latestPercentage: latest.percentage,
        weak,
        reason: weak
          ? `${latest.subject} is weak because average score is ${averagePercentage}% and average accuracy is ${averageAccuracy}%.`
          : `${latest.subject} is steady at ${averagePercentage}% average.`
      };
    })
    .sort((a, b) => a.averagePercentage - b.averagePercentage || a.subject.localeCompare(b.subject));
  const weakTopicCounts = new Map<string, number>();

  sortedTests.forEach((test) => {
    test.topicAnalyses
      .filter((item) => item.performanceLevel === "Weak" || item.performanceLevel === "Critical")
      .forEach((item) => {
        const label = item.topicName || item.chapterName || item.subject;
        weakTopicCounts.set(label, (weakTopicCounts.get(label) ?? 0) + 1);
      });
  });

  return {
    totalMocks,
    averageScore,
    highestScore,
    lowestScore,
    latestMock,
    scoreTrend: trendFrom(sortedTests.slice(0, 3).map((test) => test.percentage)),
    accuracyTrend: trendFrom(sortedTests.slice(0, 3).map((test) => test.accuracy)),
    bestSubject: [...subjectSummaries].sort((a, b) => b.averagePercentage - a.averagePercentage)[0] ?? null,
    weakestSubject: subjectSummaries.find((summary) => summary.weak) ?? null,
    biggestMistakeType: getTopMistakeTag(sortedTests),
    repeatedWeakTopic: [...weakTopicCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null,
    timePressureFrequency: sortedTests.filter((test) => test.timeAnalysis?.timePressure || test.mistakeTags.includes("Time Pressure")).length,
    subjectSummaries,
    nextRepairSuggestion: latestMock ? getMockRepairSuggestions(latestMock)[0] ?? null : null
  };
}
