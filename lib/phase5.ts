import {
  addDays,
  getDateKey,
  getDateKeysBetween,
  getTodayDateKey,
  getWeekDateKeys,
  parseDateKey
} from "@/lib/date";
import type {
  HabitCompletion,
  HeatmapDay,
  MockTestResult,
  ProductivityScore,
  RevisionPlan,
  StudyGoal,
  StudyHabit,
  StudySession,
  StudyStreak,
  StudyTask,
  SyllabusChapter,
  SyllabusSubject,
  SyllabusTopic,
  WeakAreaInsight,
  WeakAreaStatus
} from "@/types";

export interface GoalProgress {
  currentValue: number;
  percent: number;
  status: "active" | "completed" | "overdue";
}

export interface GoalProgressContext {
  sessions: StudySession[];
  tasks: StudyTask[];
  subjects: SyllabusSubject[];
  chapters: SyllabusChapter[];
  topics: SyllabusTopic[];
  mockTests: MockTestResult[];
  habits: StudyHabit[];
  habitCompletions: HabitCompletion[];
}

export interface ProductivityContext {
  sessions: StudySession[];
  tasks: StudyTask[];
  habits: StudyHabit[];
  habitCompletions: HabitCompletion[];
  revisions: RevisionPlan[];
  streak: StudyStreak | null;
}

export interface WeakAreaContext {
  subjects: SyllabusSubject[];
  topics: SyllabusTopic[];
  revisions: RevisionPlan[];
  tasks: StudyTask[];
  sessions: StudySession[];
  mockTests: MockTestResult[];
}

export function normalizeSubjectName(value?: string | null): string {
  return String(value ?? "").trim().toLowerCase();
}

export function percent(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

export function getHeatmapIntensity(minutes: number): HeatmapDay["intensity"] {
  if (minutes >= 120) {
    return 4;
  }

  if (minutes >= 60) {
    return 3;
  }

  if (minutes >= 25) {
    return 2;
  }

  if (minutes > 0) {
    return 1;
  }

  return 0;
}

export function buildHeatmapDays(sessions: StudySession[], days = 365): HeatmapDay[] {
  const today = parseDateKey(getTodayDateKey());
  const start = addDays(today, -(days - 1));

  return getDateKeysBetween(getDateKey(start), getDateKey(today)).map((date) => {
    const daySessions = sessions.filter((session) => session.date === date);
    const minutes = daySessions.reduce((total, session) => total + session.duration, 0);

    return {
      date,
      minutes,
      sessionCount: daySessions.length,
      sessions: daySessions,
      intensity: getHeatmapIntensity(minutes)
    };
  });
}

export function calculateBestSessionStreak(sessions: StudySession[]): number {
  const dates = [...new Set(sessions.filter((session) => session.duration > 0).map((session) => session.date))].sort();
  let best = 0;
  let current = 0;
  let previous: string | null = null;

  for (const date of dates) {
    const expectedPrevious = getDateKey(addDays(parseDateKey(date), -1));
    current = previous === expectedPrevious ? current + 1 : 1;
    best = Math.max(best, current);
    previous = date;
  }

  return best;
}

export function calculateProductivityForDate(date: string, context: ProductivityContext): ProductivityScore {
  const daySessions = context.sessions.filter((session) => session.date === date);
  const dayTasks = context.tasks.filter((task) => task.date === date);
  const completedTasks = dayTasks.filter((task) => task.completed).length;
  const dayMinutes = daySessions.reduce((total, session) => total + session.duration, 0);
  const dayHabitCompletions = context.habitCompletions.filter((completion) => completion.date === date).length;
  const dueRevisions = context.revisions.filter((revision) => !revision.completed && revision.nextRevisionDate <= date);
  const completedRevisions = context.revisions.filter((revision) => revision.lastRevisedDate === date).length;
  const taskRate = dayTasks.length > 0 ? completedTasks / dayTasks.length : 0;
  const habitRate = context.habits.length > 0 ? dayHabitCompletions / context.habits.length : 0;
  const revisionRate = dueRevisions.length > 0 ? Math.min(1, completedRevisions / dueRevisions.length) : 1;
  const breakdown = {
    studyTime: Math.round(Math.min(30, (dayMinutes / 120) * 30)),
    sessions: Math.round(Math.min(10, (daySessions.length / 2) * 10)),
    tasks: Math.round(taskRate * 20),
    habits: Math.round(habitRate * 15),
    revisions: Math.round(revisionRate * 15),
    streak: context.streak?.lastActiveDate && context.streak.lastActiveDate >= date ? 10 : 0
  };
  const score = Object.values(breakdown).reduce((total, item) => total + item, 0);
  const suggestions: string[] = [];

  if (breakdown.studyTime < 12) {
    suggestions.push("Start with one 25-minute focus session.");
  }

  if (dayTasks.length > 0 && taskRate < 0.5) {
    suggestions.push("Complete smaller tasks to build momentum.");
  }

  if (context.habits.length > 0 && habitRate < 0.5) {
    suggestions.push("Focus on one habit today.");
  }

  if (dueRevisions.length > completedRevisions) {
    suggestions.push("Clear overdue revisions first.");
  }

  if (suggestions.length === 0) {
    suggestions.push("Keep the day simple and protect one focused block.");
  }

  return {
    date,
    score,
    weeklyAverage: score,
    breakdown,
    suggestions,
    weeklyBars: []
  };
}

export function calculateProductivityScore(context: ProductivityContext): ProductivityScore {
  const weekDates = getWeekDateKeys();
  const scores = weekDates.map((date) => calculateProductivityForDate(date, context));
  const today = getTodayDateKey();
  const todayScore = scores.find((item) => item.date === today) ?? calculateProductivityForDate(today, context);
  const weeklyAverage = Math.round(scores.reduce((total, item) => total + item.score, 0) / Math.max(1, scores.length));

  return {
    ...todayScore,
    weeklyAverage,
    weeklyBars: scores.map((item) => ({ date: item.date, score: item.score }))
  };
}

function valueWithinRange(date: string, startDate: string, targetDate: string): boolean {
  return date >= startDate && date <= targetDate;
}

export function calculateGoalProgress(goal: StudyGoal, context: GoalProgressContext): GoalProgress {
  let currentValue = goal.currentValue;

  if (goal.goalType === "studyHours") {
    const minutes = context.sessions
      .filter((session) => valueWithinRange(session.date, goal.startDate, goal.targetDate))
      .reduce((total, session) => total + session.duration, 0);
    currentValue = minutes > 0 ? Math.round((minutes / 60) * 10) / 10 : goal.currentValue;
  }

  if (goal.goalType === "taskCompletion") {
    const tasks = context.tasks.filter((task) => valueWithinRange(task.date, goal.startDate, goal.targetDate));
    currentValue = tasks.length > 0 ? tasks.filter((task) => task.completed).length : goal.currentValue;
  }

  if (goal.goalType === "subjectCompletion" && goal.linkedSubjectId) {
    const subjectTopics = context.topics.filter((topic) => topic.subjectId === goal.linkedSubjectId);
    currentValue = subjectTopics.length > 0 ? percent(subjectTopics.filter((topic) => topic.completed).length, subjectTopics.length) : goal.currentValue;
  }

  if (goal.goalType === "chapterCompletion" && goal.linkedChapterId) {
    const chapterTopics = context.topics.filter((topic) => topic.chapterId === goal.linkedChapterId);
    currentValue = chapterTopics.length > 0 ? percent(chapterTopics.filter((topic) => topic.completed).length, chapterTopics.length) : goal.currentValue;
  }

  if (goal.goalType === "mockTestScore") {
    const subject = normalizeSubjectName(goal.linkedSubjectName);
    const tests = context.mockTests.filter((test) => {
      const matchesSubject = subject ? normalizeSubjectName(test.subject) === subject : true;

      return matchesSubject && valueWithinRange(test.testDate, goal.startDate, goal.targetDate);
    });
    currentValue = tests.length > 0 ? Math.max(...tests.map((test) => test.percentage)) : goal.currentValue;
  }

  if (goal.goalType === "habitConsistency") {
    const dates = getDateKeysBetween(goal.startDate, goal.targetDate);
    const possible = context.habits.length * dates.length;
    const completed = context.habitCompletions.filter((completion) => dates.includes(completion.date)).length;
    currentValue = possible > 0 ? percent(completed, possible) : goal.currentValue;
  }

  const progressPercent = Math.min(100, percent(currentValue, goal.targetValue));
  const status = goal.status === "completed" || progressPercent >= 100
    ? "completed"
    : goal.targetDate < getTodayDateKey()
      ? "overdue"
      : "active";

  return { currentValue, percent: progressPercent, status };
}

export function calculateGoalCompletionRate(goals: StudyGoal[], context: GoalProgressContext): number {
  if (goals.length === 0) {
    return 0;
  }

  const completed = goals.filter((goal) => calculateGoalProgress(goal, context).status === "completed").length;

  return percent(completed, goals.length);
}

export function detectWeakAreas(context: WeakAreaContext): WeakAreaInsight[] {
  const subjectNames = new Map<string, string>();

  for (const subject of context.subjects) {
    subjectNames.set(normalizeSubjectName(subject.name), subject.name);
  }

  for (const item of [...context.tasks, ...context.sessions, ...context.revisions, ...context.mockTests]) {
    const rawSubject = "subject" in item ? item.subject : "";
    const key = normalizeSubjectName(rawSubject);

    if (key && !subjectNames.has(key)) {
      subjectNames.set(key, String(rawSubject));
    }
  }

  for (const test of context.mockTests) {
    [...test.subjectBreakdowns.map((row) => row.subject), ...test.topicAnalyses.map((row) => row.subject)].forEach((rawSubject) => {
      const key = normalizeSubjectName(rawSubject);

      if (key && !subjectNames.has(key)) {
        subjectNames.set(key, rawSubject);
      }
    });
  }

  return [...subjectNames.entries()]
    .map(([key, subjectName]) => {
      const subject = context.subjects.find((item) => normalizeSubjectName(item.name) === key);
      const subjectTopics = subject ? context.topics.filter((topic) => topic.subjectId === subject.id) : [];
      const completedTopics = subjectTopics.filter((topic) => topic.completed).length;
      const syllabusProgress = subjectTopics.length > 0 ? percent(completedTopics, subjectTopics.length) : null;
      const overdueRevisions = context.revisions.filter(
        (revision) => normalizeSubjectName(revision.subject) === key && !revision.completed && revision.nextRevisionDate < getTodayDateKey()
      );
      const subjectTestScores = context.mockTests.flatMap((test) => {
        const rows = test.subjectBreakdowns.filter((row) => normalizeSubjectName(row.subject) === key);

        if (rows.length > 0) {
          return rows.map((row) => row.percentage);
        }

        return normalizeSubjectName(test.subject) === key ? [test.percentage] : [];
      }).slice(0, 5);
      const mockAverage = subjectTestScores.length > 0
        ? Math.round(subjectTestScores.reduce((total, score) => total + score, 0) / subjectTestScores.length)
        : null;
      const recentCutoff = getDateKey(addDays(parseDateKey(getTodayDateKey()), -14));
      const recentMinutes = context.sessions
        .filter((session) => normalizeSubjectName(session.subject) === key && session.date >= recentCutoff)
        .reduce((total, session) => total + session.duration, 0);
      const unfinishedTasks = context.tasks.filter(
        (task) => normalizeSubjectName(task.subject) === key && !task.completed
      ).length;
      const reasons: string[] = [];

      if (syllabusProgress !== null && syllabusProgress < 50) {
        reasons.push(`${syllabusProgress}% syllabus completion`);
      }

      if (overdueRevisions.length >= 2) {
        reasons.push(`${overdueRevisions.length} overdue revisions`);
      }

      if (mockAverage !== null && mockAverage < 60) {
        reasons.push(`${mockAverage}% recent mock average`);
      }

      if (recentMinutes === 0) {
        reasons.push("No recent study time in 14 days");
      }

      if (unfinishedTasks >= 3) {
        reasons.push(`${unfinishedTasks} unfinished tasks`);
      }

      let status: WeakAreaStatus = "Good progress";
      let score = 70;

      if (reasons.length >= 3 || overdueRevisions.length >= 4 || (mockAverage !== null && mockAverage < 50)) {
        status = "Falling behind";
        score = 25;
      } else if (reasons.length > 0) {
        status = "Needs attention";
        score = 45;
      } else if ((syllabusProgress ?? 100) >= 80 && (mockAverage ?? 80) >= 75 && recentMinutes > 0) {
        status = "Strong area";
        score = 90;
      }

      return {
        subject: subjectName,
        status,
        score,
        reasons: reasons.length > 0 ? reasons : ["Recent study signals look steady."],
        nextAction:
          status === "Falling behind"
            ? "Revise one overdue topic today and finish one small task."
            : status === "Needs attention"
              ? "Schedule one focused review block for this subject."
              : "Keep one light maintenance session on the calendar."
      };
    })
    .sort((a, b) => a.score - b.score || a.subject.localeCompare(b.subject));
}
