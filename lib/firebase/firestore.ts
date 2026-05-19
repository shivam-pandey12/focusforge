import type { User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as queryLimit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  where,
  type DocumentData,
  type QuerySnapshot,
  type Unsubscribe
} from "firebase/firestore";
import { getDateKey, getDurationBetweenTimes, getTodayDateKey } from "@/lib/date";
import { ensureFirestoreDb } from "@/lib/firebase/config";
import { calculateMarksPercentage, normalizeMarksEntryScope, normalizeMistakeTags, requiresSubjectForScope } from "@/lib/marks";
import { normalizeBillingCycle, normalizePlanTier, normalizeSubscriptionStatus } from "@/lib/plans";
import { getNextStreakState } from "@/lib/streak";
import {
  DEFAULT_SCHEDULE_PROFILE_ID,
  DEFAULT_SCHEDULE_PROFILE_NAME,
  normalizeCycleDay,
  normalizeCycleLength,
  normalizeScheduleProfileType,
  normalizeTimetableBlockSchedule,
  normalizeTimetableScheduleMode,
  normalizeTimetableWeekGroup
} from "@/lib/timetable";
import type {
  AccountDeletionRequest,
  AssignmentPriority,
  AssignmentStatus,
  AppUser,
  BacklogItem,
  BacklogLevel,
  BacklogReason,
  BacklogStatus,
  BattlePlanItemStatus,
  ExamSchedule,
  FocusSessionStatus,
  HabitCompletion,
  MarksEntry,
  MarksEntryScope,
  MistakeTag,
  MockExamType,
  MockMistakeTag,
  MockPerformanceLevel,
  MockSubjectBreakdown,
  MockTestResult,
  MockTimeAnalysis,
  MockTopicAnalysis,
  PaymentRecord,
  RevisionPlan,
  RevisionStatus,
  RevisionType,
  ScheduleProfile,
  ScheduleProfileType,
  DailyReview,
  DailyBattlePlan,
  DailyBattlePlanItem,
  StudyAssignment,
  StudyGoal,
  StudyGoalStatus,
  StudyGoalType,
  StudyHabit,
  StudyJournalEntry,
  StudyNote,
  StudyReminder,
  StudyReminderStatus,
  StudyReminderType,
  StudySession,
  StudyStreak,
  StudyTemplate,
  StudyTemplateConfig,
  StudyTemplateType,
  StudyTask,
  SyllabusChapter,
  SyllabusSubject,
  SyllabusTopic,
  TopicStudyStatus,
  TimetableClassType,
  TimetableBlock,
  TimetableScheduleMode,
  TimetableWeekGroup,
  UserProfile,
  WeeklyReview
} from "@/types";

export interface StudyNoteInput {
  title: string;
  content: string;
  subject?: string;
  linkedTaskId?: string;
  linkedTaskTitle?: string;
}

export interface TimetableBlockInput {
  title?: string;
  subjectId?: string;
  subject: string;
  classType?: TimetableClassType;
  dayOfWeek: number;
  date?: string;
  startTime: string;
  endTime: string;
  teacherName?: string;
  location?: string;
  notes?: string;
  isRecurring: boolean;
  scheduleMode?: TimetableScheduleMode;
  scheduleProfileId?: string;
  scheduleProfileName?: string;
  weekGroup?: TimetableWeekGroup;
  cycleDayNumber?: number | string | null;
  cycleLength?: number | string | null;
  effectiveFrom?: string;
  effectiveUntil?: string;
  isActive?: boolean;
  conflictIgnored?: boolean;
}

export interface ScheduleProfileInput {
  name: string;
  type: ScheduleProfileType;
  color?: string;
  description?: string;
  scheduleMode: TimetableScheduleMode;
  activeWeek?: Exclude<TimetableWeekGroup, "Both">;
  cycleLength?: number | string;
  activeCycleDay?: number | string;
}

export interface SyllabusSubjectInput {
  name: string;
  color?: string;
  icon?: string;
  targetType?: "score" | "percentage";
  targetValue?: number | string | null;
  description?: string;
}

export interface StudyAssignmentInput {
  title: string;
  subjectId?: string;
  subject: string;
  dueDate: string;
  priority: AssignmentPriority;
  status: AssignmentStatus;
  estimatedMinutes?: number | string | null;
  notes?: string;
}

export interface ExamScheduleInput {
  name: string;
  subjectId?: string;
  subject?: string;
  fullSyllabus: boolean;
  date: string;
  startTime?: string;
  durationMinutes?: number | string | null;
  totalMarks?: number | string | null;
  syllabusNotes?: string;
  notes?: string;
}

export interface MarksEntryInput {
  testName: string;
  subjectId?: string;
  subject?: string;
  examScheduleId?: string;
  scope: MarksEntryScope;
  date: string;
  score: number | string;
  totalMarks: number | string;
  rank?: number | string | null;
  percentile?: number | string | null;
  durationMinutes?: number | string | null;
  mistakeTags?: MistakeTag[];
  mistakeNotes?: string;
  notes?: string;
}

export interface BacklogItemInput {
  title: string;
  subjectId?: string;
  subject: string;
  subjectColor?: string;
  subjectIcon?: string;
  chapterId?: string;
  chapterName?: string;
  topicId?: string;
  topicName?: string;
  mockTestId?: string;
  sourceType?: string;
  sourceId?: string;
  backlogLevel: BacklogLevel;
  reason: BacklogReason;
  targetFinishDate?: string;
  estimatedMinutes?: number | string | null;
  status: BacklogStatus;
  priority: AssignmentPriority;
  notes?: string;
}

export interface DailyBattlePlanInput {
  date: string;
  availableMinutes: number | string;
  items: DailyBattlePlanItem[];
}

export interface RevisionPlanInput {
  title: string;
  subjectId?: string;
  subject: string;
  chapterId?: string;
  chapterName?: string;
  topicId?: string;
  topicName?: string;
  backlogItemId?: string;
  mockTestId?: string;
  sourceType?: string;
  sourceId?: string;
  revisionType?: RevisionType;
  priority?: AssignmentPriority;
  status?: RevisionStatus;
  notes?: string;
  nextRevisionDate?: string;
  dueDate?: string;
  revisionDate?: string;
}

export interface FocusSessionInput {
  taskId?: string;
  taskTitle: string;
  subject?: string;
  subjectId?: string;
  revisionPlanId?: string;
  assignmentId?: string;
  backlogItemId?: string;
  sourceType?: string;
  sourceId?: string;
  battlePlanId?: string;
  battlePlanItemId?: string;
  chapterId?: string;
  topicId?: string;
  plannedDuration: number;
  actualDuration: number;
  startedAtIso: string;
  endedAtIso?: string;
  status: FocusSessionStatus;
  notes?: string;
}

export interface StudyHabitInput {
  title: string;
  description?: string;
}

export interface MockTestInput {
  title: string;
  examType?: string;
  subjectId?: string;
  subject?: string;
  subjectColor?: string;
  subjectIcon?: string;
  score: number;
  totalMarks: number;
  percentile?: number | string | null;
  rank?: number | string | null;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  timeTakenMinutes: number;
  testDate: string;
  subjectBreakdowns?: MockSubjectBreakdownInput[];
  topicAnalyses?: MockTopicAnalysisInput[];
  mistakeTags?: MockMistakeTag[];
  timeAnalysis?: MockTimeAnalysisInput;
  notes?: string;
}

export interface MockSubjectBreakdownInput {
  id?: string;
  subjectId?: string;
  subject: string;
  subjectColor?: string;
  subjectIcon?: string;
  score: number | string;
  totalMarks: number | string;
  attempted?: number | string | null;
  correct?: number | string | null;
  incorrect?: number | string | null;
  skipped?: number | string | null;
  timeSpentMinutes?: number | string | null;
  notes?: string;
}

export interface MockTopicAnalysisInput {
  id?: string;
  subjectId?: string;
  subject: string;
  subjectColor?: string;
  subjectIcon?: string;
  chapterId?: string;
  chapterName?: string;
  topicId?: string;
  topicName?: string;
  performanceLevel: MockPerformanceLevel;
  attempted?: number | string | null;
  correct?: number | string | null;
  incorrect?: number | string | null;
  skipped?: number | string | null;
  mistakeTags?: MockMistakeTag[];
  notes?: string;
}

export interface MockTimeAnalysisInput {
  totalTimeSpentMinutes?: number | string | null;
  timePressure?: boolean;
  slowSubject?: string;
  rushedSubject?: string;
  notes?: string;
}

export interface StudyGoalInput {
  title: string;
  goalType: StudyGoalType;
  targetValue: number;
  currentValue: number;
  startDate: string;
  targetDate: string;
  linkedSubjectId?: string;
  linkedSubjectName?: string;
  linkedChapterId?: string;
  linkedChapterName?: string;
  status?: StudyGoalStatus;
}

export interface StudyJournalInput {
  sessionId?: string;
  taskId?: string;
  subject?: string;
  title: string;
  studiedText: string;
  struggleText: string;
  nextAction: string;
  moodRating: number;
  focusRating: number;
  difficultyRating: number;
  date: string;
}

export interface UserProfileInput {
  displayName?: string;
  profileImageDataUrl?: string;
  studyGoal: string;
  dailyStudyTargetMinutes: number;
  preferredFocusDuration: number;
  subjects: string[];
  onboardingCompleted: boolean;
  notificationEnabled: boolean;
  reminderTime: string;
  revisionReminderEnabled: boolean;
  habitReminderEnabled: boolean;
  taskReminderEnabled: boolean;
  emailNotificationsEnabled: boolean;
  welcomeEmailsEnabled: boolean;
  paymentEmailsEnabled: boolean;
  planExpiryEmailsEnabled: boolean;
  weeklySummaryEmailsEnabled: boolean;
  weekStartDay: number;
}

export interface StudyTemplateInput {
  title: string;
  description: string;
  type: StudyTemplateType;
  config: StudyTemplateConfig;
}

export interface DailyReviewInput {
  date: string;
  winsText: string;
  improveText: string;
  tomorrowFocusText: string;
  moodRating: number;
}

export interface WeeklyReviewInput {
  weekKey: string;
  winsText: string;
  challengesText: string;
  nextWeekFocusText: string;
}

export interface StudyReminderInput {
  type: StudyReminderType;
  title: string;
  message?: string;
  date: string;
  time?: string;
  subjectId?: string;
  subject?: string;
  linkedRevisionId?: string;
  linkedAssignmentId?: string;
  linkedExamId?: string;
  notes?: string;
  status?: StudyReminderStatus;
}

export const READ_LIMITS = {
  notesPage: 50,
  notesPageStep: 50,
  assignmentsPage: 100,
  examSchedulesPage: 100,
  marksEntriesPage: 100,
  backlogItemsPage: 100,
  dailyBattlePlansPage: 30,
  mockTestsPage: 50,
  journalsPage: 30,
  goalsPage: 50,
  remindersPage: 50,
  dailyReviewsPage: 30,
  weeklyReviewsPage: 12,
  paymentsPage: 20,
  recentTasks: 365,
  recentSessions: 365
} as const;

export function getFirestoreErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Firestore request failed. Please try again.";
}

function isMissingIndexError(error: unknown): boolean {
  const maybeCode = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
  const message = getFirestoreErrorMessage(error).toLowerCase();

  return maybeCode === "failed-precondition"
    && (message.includes("requires an index") || message.includes("create it here"));
}

function isDateInRange(dateKey: string, startDateKey: string, endDateKey: string): boolean {
  return dateKey >= startDateKey && dateKey <= endDateKey;
}

function shouldLogClientDiagnostics(): boolean {
  return process.env.NEXT_PUBLIC_FOCUSFORGE_DIAGNOSTICS === "true";
}

function logFirestoreRead(label: string, durationMs: number, count: number): void {
  if (!shouldLogClientDiagnostics() || typeof console === "undefined") {
    return;
  }

  console.info("[FocusForge Firestore]", {
    label,
    durationMs: Math.round(durationMs),
    count
  });
}

async function timedFirestoreRead<T extends { length: number }>(
  label: string,
  read: () => Promise<T>
): Promise<T> {
  const startedAt =
    typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();

  const result = await read();
  const finishedAt =
    typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();

  logFirestoreRead(label, finishedAt - startedAt, result.length);
  return result;
}

function getOptionalString(value: unknown): string | undefined {
  const text = String(value ?? "").trim();

  return text.length > 0 ? text : undefined;
}

function normalizeTimetableDayOfWeek(value: unknown): number {
  const numericDay = Number(value);

  if (Number.isInteger(numericDay) && numericDay >= 0 && numericDay <= 6) {
    return numericDay;
  }

  const dayName = String(value ?? "").trim().toLowerCase();
  const dayMap: Record<string, number> = {
    sunday: 0,
    sun: 0,
    monday: 1,
    mon: 1,
    tuesday: 2,
    tue: 2,
    tues: 2,
    wednesday: 3,
    wed: 3,
    thursday: 4,
    thu: 4,
    thur: 4,
    thurs: 4,
    friday: 5,
    fri: 5,
    saturday: 6,
    sat: 6
  };

  return dayMap[dayName] ?? 0;
}

function normalizeTimetableRecurring(data: DocumentData): boolean {
  if (typeof data.isRecurring === "boolean") {
    return data.isRecurring;
  }

  return !getOptionalString(data.date);
}

function mapTaskDoc(id: string, data: DocumentData): StudyTask {
  return {
    id,
    userId: String(data.userId ?? ""),
    title: String(data.title ?? ""),
    duration: Number(data.duration ?? 25),
    subject: getOptionalString(data.subject),
    completed: Boolean(data.completed),
    date: String(data.date ?? ""),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    completedAt: data.completedAt ?? null
  };
}

function mapTasksSnapshot(snapshot: QuerySnapshot): StudyTask[] {
  return snapshot.docs
    .map((taskDoc) => mapTaskDoc(taskDoc.id, taskDoc.data()))
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;

      return aTime - bTime;
    });
}

function mapSessionDoc(id: string, data: DocumentData): StudySession {
  const duration = Number(data.duration ?? data.actualDuration ?? data.plannedDuration ?? 0);
  const status = normalizeFocusSessionStatus(data.status);

  return {
    id,
    userId: String(data.userId ?? ""),
    taskId: String(data.taskId ?? ""),
    taskTitle: String(data.taskTitle ?? ""),
    subject: getOptionalString(data.subject),
    subjectId: getOptionalString(data.subjectId),
    duration,
    plannedDuration: Number(data.plannedDuration ?? duration),
    actualDuration: Number(data.actualDuration ?? duration),
    startedAt: data.startedAt ?? null,
    endedAt: data.endedAt ?? data.completedAt ?? null,
    status,
    revisionPlanId: getOptionalString(data.revisionPlanId),
    assignmentId: getOptionalString(data.assignmentId),
    backlogItemId: getOptionalString(data.backlogItemId),
    sourceType: getOptionalString(data.sourceType) as StudySession["sourceType"],
    sourceId: getOptionalString(data.sourceId),
    battlePlanId: getOptionalString(data.battlePlanId),
    battlePlanItemId: getOptionalString(data.battlePlanItemId),
    chapterId: getOptionalString(data.chapterId),
    topicId: getOptionalString(data.topicId),
    notes: getOptionalString(data.notes),
    completedAt: data.completedAt ?? null,
    date: String(data.date ?? "")
  };
}

function mapSessionsSnapshot(snapshot: QuerySnapshot): StudySession[] {
  return snapshot.docs
    .map((sessionDoc) => mapSessionDoc(sessionDoc.id, sessionDoc.data()))
    .sort((a, b) => {
      const aTime = a.endedAt?.toMillis?.() ?? a.completedAt?.toMillis?.() ?? 0;
      const bTime = b.endedAt?.toMillis?.() ?? b.completedAt?.toMillis?.() ?? 0;

      return bTime - aTime;
    });
}

function mapNoteDoc(id: string, data: DocumentData): StudyNote {
  return {
    id,
    userId: String(data.userId ?? ""),
    title: String(data.title ?? ""),
    content: String(data.content ?? ""),
    subject: getOptionalString(data.subject),
    linkedTaskId: getOptionalString(data.linkedTaskId),
    linkedTaskTitle: getOptionalString(data.linkedTaskTitle),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null
  };
}

function mapNotesSnapshot(snapshot: QuerySnapshot): StudyNote[] {
  return snapshot.docs
    .map((noteDoc) => mapNoteDoc(noteDoc.id, noteDoc.data()))
    .sort((a, b) => {
      const aTime = a.updatedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.updatedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;

      return bTime - aTime;
    });
}

function mapStreak(data: DocumentData): StudyStreak {
  return {
    userId: String(data.userId ?? ""),
    currentStreak: Number(data.currentStreak ?? 0),
    longestStreak: Number(data.longestStreak ?? data.currentStreak ?? 0),
    lastActiveDate: String(data.lastActiveDate ?? ""),
    updatedAt: data.updatedAt ?? null
  };
}

function mapTimetableBlockDoc(id: string, data: DocumentData): TimetableBlock {
  const scheduleMode = normalizeTimetableScheduleMode(data.scheduleMode);
  const cycleLength = data.cycleLength === null || data.cycleLength === undefined || data.cycleLength === ""
    ? null
    : normalizeCycleLength(data.cycleLength);

  return {
    id,
    userId: String(data.userId ?? ""),
    title: String(data.title ?? data.subject ?? ""),
    subjectId: getOptionalString(data.subjectId),
    subject: String(data.subject ?? ""),
    classType: normalizeTimetableClassType(data.classType),
    dayOfWeek: normalizeTimetableDayOfWeek(data.dayOfWeek ?? data.day),
    date: getOptionalString(data.date),
    startTime: String(data.startTime ?? "09:00"),
    endTime: String(data.endTime ?? "10:00"),
    duration: Number(data.duration ?? 60),
    teacherName: getOptionalString(data.teacherName),
    location: getOptionalString(data.location),
    notes: getOptionalString(data.notes),
    isRecurring: normalizeTimetableRecurring(data),
    scheduleMode,
    scheduleProfileId: getOptionalString(data.scheduleProfileId) ?? DEFAULT_SCHEDULE_PROFILE_ID,
    scheduleProfileName: getOptionalString(data.scheduleProfileName) ?? DEFAULT_SCHEDULE_PROFILE_NAME,
    weekGroup: normalizeTimetableWeekGroup(data.weekGroup),
    cycleDayNumber: data.cycleDayNumber === null || data.cycleDayNumber === undefined || data.cycleDayNumber === ""
      ? null
      : normalizeCycleDay(data.cycleDayNumber, cycleLength ?? 5),
    cycleLength,
    effectiveFrom: getOptionalString(data.effectiveFrom),
    effectiveUntil: getOptionalString(data.effectiveUntil),
    isActive: data.isActive !== false,
    conflictIgnored: Boolean(data.conflictIgnored),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null
  };
}

function mapTimetableBlocksSnapshot(snapshot: QuerySnapshot): TimetableBlock[] {
  return snapshot.docs
    .map((blockDoc) => mapTimetableBlockDoc(blockDoc.id, blockDoc.data()))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
}

function mapScheduleProfileDoc(id: string, data: DocumentData): ScheduleProfile {
  const cycleLength = normalizeCycleLength(data.cycleLength);

  return {
    id,
    userId: String(data.userId ?? ""),
    name: String(data.name ?? DEFAULT_SCHEDULE_PROFILE_NAME),
    type: normalizeScheduleProfileType(data.type),
    color: getOptionalString(data.color),
    description: getOptionalString(data.description),
    isActive: Boolean(data.isActive),
    scheduleMode: normalizeTimetableScheduleMode(data.scheduleMode),
    activeWeek: data.activeWeek === "B" ? "B" : "A",
    cycleLength,
    activeCycleDay: normalizeCycleDay(data.activeCycleDay, cycleLength),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null
  };
}

function mapScheduleProfilesSnapshot(snapshot: QuerySnapshot): ScheduleProfile[] {
  return snapshot.docs
    .map((profileDoc) => mapScheduleProfileDoc(profileDoc.id, profileDoc.data()))
    .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name));
}

function mapRevisionPlanDoc(id: string, data: DocumentData): RevisionPlan {
  const dueDate = String(data.dueDate ?? data.revisionDate ?? data.nextRevisionDate ?? "");
  const status = normalizeRevisionStatus(data.status, Boolean(data.completed));

  return {
    id,
    userId: String(data.userId ?? ""),
    title: String(data.title ?? ""),
    subjectId: getOptionalString(data.subjectId),
    subject: String(data.subject ?? ""),
    chapterId: getOptionalString(data.chapterId),
    chapterName: getOptionalString(data.chapterName),
    topicId: getOptionalString(data.topicId),
    topicName: getOptionalString(data.topicName),
    backlogItemId: getOptionalString(data.backlogItemId),
    mockTestId: getOptionalString(data.mockTestId),
    sourceType: getOptionalString(data.sourceType),
    sourceId: getOptionalString(data.sourceId),
    revisionType: normalizeRevisionType(data.revisionType),
    priority: normalizeAssignmentPriority(data.priority),
    status,
    notes: getOptionalString(data.notes),
    nextRevisionDate: String(data.nextRevisionDate ?? dueDate),
    dueDate,
    revisionDate: getOptionalString(data.revisionDate),
    lastRevisedDate: getOptionalString(data.lastRevisedDate),
    revisionCount: Number(data.revisionCount ?? 0),
    completed: status !== "Pending",
    completedAt: data.completedAt ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null
  };
}

function mapRevisionPlansSnapshot(snapshot: QuerySnapshot): RevisionPlan[] {
  return snapshot.docs
    .map((planDoc) => mapRevisionPlanDoc(planDoc.id, planDoc.data()))
    .sort((a, b) => a.nextRevisionDate.localeCompare(b.nextRevisionDate) || a.title.localeCompare(b.title));
}

function mapSyllabusSubjectDoc(id: string, data: DocumentData): SyllabusSubject {
  return {
    id,
    userId: String(data.userId ?? ""),
    name: String(data.name ?? ""),
    color: getOptionalString(data.color),
    icon: getOptionalString(data.icon),
    targetType: data.targetType === "score" || data.targetType === "percentage" ? data.targetType : undefined,
    targetValue: data.targetValue === null || data.targetValue === undefined || data.targetValue === ""
      ? null
      : Number.isFinite(Number(data.targetValue)) ? Number(data.targetValue) : null,
    description: getOptionalString(data.description),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null
  };
}

function mapStudyAssignmentDoc(id: string, data: DocumentData): StudyAssignment {
  return {
    id,
    userId: String(data.userId ?? ""),
    title: String(data.title ?? ""),
    subjectId: getOptionalString(data.subjectId),
    subject: String(data.subject ?? ""),
    dueDate: String(data.dueDate ?? ""),
    priority: normalizeAssignmentPriority(data.priority),
    status: normalizeAssignmentStatus(data.status),
    estimatedMinutes: data.estimatedMinutes === null || data.estimatedMinutes === undefined || data.estimatedMinutes === ""
      ? null
      : Number.isFinite(Number(data.estimatedMinutes)) ? Number(data.estimatedMinutes) : null,
    notes: getOptionalString(data.notes),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    completedAt: data.completedAt ?? null
  };
}

function mapStudyAssignmentsSnapshot(snapshot: QuerySnapshot): StudyAssignment[] {
  return snapshot.docs
    .map((assignmentDoc) => mapStudyAssignmentDoc(assignmentDoc.id, assignmentDoc.data()))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title));
}

function mapExamScheduleDoc(id: string, data: DocumentData): ExamSchedule {
  return {
    id,
    userId: String(data.userId ?? ""),
    name: String(data.name ?? ""),
    subjectId: getOptionalString(data.subjectId),
    subject: getOptionalString(data.subject),
    fullSyllabus: Boolean(data.fullSyllabus),
    date: String(data.date ?? ""),
    startTime: getOptionalString(data.startTime),
    durationMinutes: data.durationMinutes === null || data.durationMinutes === undefined || data.durationMinutes === ""
      ? null
      : Number.isFinite(Number(data.durationMinutes)) ? Number(data.durationMinutes) : null,
    totalMarks: data.totalMarks === null || data.totalMarks === undefined || data.totalMarks === ""
      ? null
      : Number.isFinite(Number(data.totalMarks)) ? Number(data.totalMarks) : null,
    syllabusNotes: getOptionalString(data.syllabusNotes),
    notes: getOptionalString(data.notes),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null
  };
}

function mapExamSchedulesSnapshot(snapshot: QuerySnapshot): ExamSchedule[] {
  return snapshot.docs
    .map((examDoc) => mapExamScheduleDoc(examDoc.id, examDoc.data()))
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.startTime ?? "").localeCompare(String(b.startTime ?? "")));
}

function mapMarksEntryDoc(id: string, data: DocumentData): MarksEntry {
  const score = Number(data.score ?? 0);
  const totalMarks = Number(data.totalMarks ?? 0);

  return {
    id,
    userId: String(data.userId ?? ""),
    testName: String(data.testName ?? data.title ?? ""),
    subjectId: getOptionalString(data.subjectId),
    subject: getOptionalString(data.subject),
    examScheduleId: getOptionalString(data.examScheduleId),
    scope: normalizeMarksEntryScope(data.scope),
    date: String(data.date ?? data.testDate ?? ""),
    score: Number.isFinite(score) ? score : 0,
    totalMarks: Number.isFinite(totalMarks) ? totalMarks : 0,
    percentage: Number.isFinite(Number(data.percentage))
      ? Number(data.percentage)
      : calculateMarksPercentage(score, totalMarks),
    rank: data.rank === null || data.rank === undefined || data.rank === ""
      ? null
      : Number.isFinite(Number(data.rank)) ? Number(data.rank) : null,
    percentile: data.percentile === null || data.percentile === undefined || data.percentile === ""
      ? null
      : Number.isFinite(Number(data.percentile)) ? Number(data.percentile) : null,
    durationMinutes: data.durationMinutes === null || data.durationMinutes === undefined || data.durationMinutes === ""
      ? null
      : Number.isFinite(Number(data.durationMinutes)) ? Number(data.durationMinutes) : null,
    mistakeTags: normalizeMistakeTags(data.mistakeTags),
    mistakeNotes: getOptionalString(data.mistakeNotes),
    notes: getOptionalString(data.notes),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null
  };
}

function mapMarksEntriesSnapshot(snapshot: QuerySnapshot): MarksEntry[] {
  return snapshot.docs
    .map((entryDoc) => mapMarksEntryDoc(entryDoc.id, entryDoc.data()))
    .sort((a, b) => b.date.localeCompare(a.date) || a.testName.localeCompare(b.testName));
}

function mapBacklogItemDoc(id: string, data: DocumentData): BacklogItem {
  return {
    id,
    userId: String(data.userId ?? ""),
    title: String(data.title ?? data.topicName ?? data.chapterName ?? "Backlog item"),
    subjectId: getOptionalString(data.subjectId),
    subject: String(data.subject ?? ""),
    subjectColor: getOptionalString(data.subjectColor),
    subjectIcon: getOptionalString(data.subjectIcon),
    chapterId: getOptionalString(data.chapterId),
    chapterName: getOptionalString(data.chapterName),
    topicId: getOptionalString(data.topicId),
    topicName: getOptionalString(data.topicName),
    mockTestId: getOptionalString(data.mockTestId),
    sourceType: getOptionalString(data.sourceType),
    sourceId: getOptionalString(data.sourceId),
    backlogLevel: normalizeBacklogLevel(data.backlogLevel),
    reason: normalizeBacklogReason(data.reason),
    targetFinishDate: getOptionalString(data.targetFinishDate),
    estimatedMinutes: data.estimatedMinutes === null || data.estimatedMinutes === undefined || data.estimatedMinutes === ""
      ? null
      : Number.isFinite(Number(data.estimatedMinutes)) ? Number(data.estimatedMinutes) : null,
    status: normalizeBacklogStatus(data.status),
    priority: normalizeAssignmentPriority(data.priority),
    notes: getOptionalString(data.notes),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    clearedAt: data.clearedAt ?? null
  };
}

function mapBacklogItemsSnapshot(snapshot: QuerySnapshot): BacklogItem[] {
  return snapshot.docs
    .map((itemDoc) => mapBacklogItemDoc(itemDoc.id, itemDoc.data()))
    .sort((a, b) => {
      const statusSort = Number(a.status === "Cleared") - Number(b.status === "Cleared");

      if (statusSort !== 0) {
        return statusSort;
      }

      const targetSort = String(a.targetFinishDate ?? "9999-12-31").localeCompare(String(b.targetFinishDate ?? "9999-12-31"));

      if (targetSort !== 0) {
        return targetSort;
      }

      return a.title.localeCompare(b.title);
    });
}

function mapDailyBattlePlanItem(data: DocumentData): DailyBattlePlanItem {
  return {
    id: String(data.id ?? `item-${Date.now()}`),
    title: String(data.title ?? "Study item"),
    type: normalizeBattlePlanItemType(data.type),
    subjectId: getOptionalString(data.subjectId),
    subject: getOptionalString(data.subject),
    subjectColor: getOptionalString(data.subjectColor),
    subjectIcon: getOptionalString(data.subjectIcon),
    recommendedDuration: Number.isFinite(Number(data.recommendedDuration)) ? Math.max(5, Math.round(Number(data.recommendedDuration))) : 25,
    priority: normalizeBattlePlanPriority(data.priority),
    score: Number.isFinite(Number(data.score)) ? Number(data.score) : 0,
    reason: String(data.reason ?? ""),
    suggestedAction: String(data.suggestedAction ?? ""),
    sourceType: normalizeBattlePlanSourceType(data.sourceType),
    sourceId: getOptionalString(data.sourceId),
    href: String(data.href ?? "/dashboard"),
    status: normalizeBattlePlanItemStatus(data.status),
    overflow: Boolean(data.overflow)
  };
}

function mapDailyBattlePlanDoc(id: string, data: DocumentData): DailyBattlePlan {
  return {
    id,
    userId: String(data.userId ?? ""),
    date: String(data.date ?? ""),
    availableMinutes: Number.isFinite(Number(data.availableMinutes)) ? Math.max(30, Math.round(Number(data.availableMinutes))) : 120,
    items: Array.isArray(data.items) ? data.items.map((item) => mapDailyBattlePlanItem(item)) : [],
    generatedAt: data.generatedAt ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null
  };
}

function mapDailyBattlePlansSnapshot(snapshot: QuerySnapshot): DailyBattlePlan[] {
  return snapshot.docs
    .map((planDoc) => mapDailyBattlePlanDoc(planDoc.id, planDoc.data()))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function mapSyllabusChapterDoc(id: string, data: DocumentData): SyllabusChapter {
  const status = normalizeTopicStudyStatus(data.status, Boolean(data.completed));

  return {
    id,
    userId: String(data.userId ?? ""),
    subjectId: String(data.subjectId ?? ""),
    name: String(data.name ?? ""),
    status,
    statusNotes: getOptionalString(data.statusNotes),
    statusUpdatedAt: data.statusUpdatedAt ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null
  };
}

function mapSyllabusTopicDoc(id: string, data: DocumentData): SyllabusTopic {
  const completed = Boolean(data.completed);
  const status = normalizeTopicStudyStatus(data.status, completed);

  return {
    id,
    userId: String(data.userId ?? ""),
    subjectId: String(data.subjectId ?? ""),
    chapterId: String(data.chapterId ?? ""),
    name: String(data.name ?? ""),
    completed: status === "Completed" || completed,
    status,
    statusNotes: getOptionalString(data.statusNotes),
    statusUpdatedAt: data.statusUpdatedAt ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null
  };
}

function sortByCreatedAt<T extends { createdAt: { toMillis?: () => number } | null; name?: string; title?: string }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() ?? 0;
    const bTime = b.createdAt?.toMillis?.() ?? 0;

    if (aTime !== bTime) {
      return aTime - bTime;
    }

    return String(a.name ?? a.title ?? "").localeCompare(String(b.name ?? b.title ?? ""));
  });
}

function mapSyllabusSubjectsSnapshot(snapshot: QuerySnapshot): SyllabusSubject[] {
  return sortByCreatedAt(snapshot.docs.map((subjectDoc) => mapSyllabusSubjectDoc(subjectDoc.id, subjectDoc.data())));
}

function mapSyllabusChaptersSnapshot(snapshot: QuerySnapshot): SyllabusChapter[] {
  return sortByCreatedAt(snapshot.docs.map((chapterDoc) => mapSyllabusChapterDoc(chapterDoc.id, chapterDoc.data())));
}

function mapSyllabusTopicsSnapshot(snapshot: QuerySnapshot): SyllabusTopic[] {
  return sortByCreatedAt(snapshot.docs.map((topicDoc) => mapSyllabusTopicDoc(topicDoc.id, topicDoc.data())));
}

function mapHabitDoc(id: string, data: DocumentData): StudyHabit {
  return {
    id,
    userId: String(data.userId ?? ""),
    title: String(data.title ?? ""),
    description: getOptionalString(data.description),
    frequency: "daily",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null
  };
}

function mapHabitsSnapshot(snapshot: QuerySnapshot): StudyHabit[] {
  return sortByCreatedAt(snapshot.docs.map((habitDoc) => mapHabitDoc(habitDoc.id, habitDoc.data())));
}

function mapHabitCompletionDoc(id: string, data: DocumentData): HabitCompletion {
  return {
    id,
    userId: String(data.userId ?? ""),
    habitId: String(data.habitId ?? ""),
    date: String(data.date ?? ""),
    completedAt: data.completedAt ?? null
  };
}

function mapHabitCompletionsSnapshot(snapshot: QuerySnapshot): HabitCompletion[] {
  return snapshot.docs
    .map((completionDoc) => mapHabitCompletionDoc(completionDoc.id, completionDoc.data()))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function mapUserProfile(data: DocumentData): UserProfile {
  return {
    userId: String(data.userId ?? ""),
    displayName: getOptionalString(data.displayName),
    profileImageDataUrl: getOptionalString(data.profileImageDataUrl),
    plan: normalizePlanTier(data.plan),
    subscriptionStatus: normalizeSubscriptionStatus(data.subscriptionStatus),
    billingCycle: normalizeBillingCycle(data.billingCycle),
    planStartedAt: data.planStartedAt ?? null,
    planExpiresAt: data.planExpiresAt ?? null,
    trialEndsAt: data.trialEndsAt ?? null,
    cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
    razorpayCustomerId: getOptionalString(data.razorpayCustomerId),
    razorpayOrderId: getOptionalString(data.razorpayOrderId),
    razorpayPaymentId: getOptionalString(data.razorpayPaymentId),
    razorpaySubscriptionId: getOptionalString(data.razorpaySubscriptionId),
    lastPaymentVerifiedAt: data.lastPaymentVerifiedAt ?? null,
    studyGoal: String(data.studyGoal ?? "General productivity"),
    dailyStudyTargetMinutes: Number(data.dailyStudyTargetMinutes ?? 120),
    preferredFocusDuration: Number(data.preferredFocusDuration ?? 25),
    subjects: Array.isArray(data.subjects) ? data.subjects.map(String) : [],
    onboardingCompleted: Boolean(data.onboardingCompleted),
    notificationEnabled: Boolean(data.notificationEnabled),
    reminderTime: String(data.reminderTime ?? "18:00"),
    revisionReminderEnabled: data.revisionReminderEnabled !== false,
    habitReminderEnabled: data.habitReminderEnabled !== false,
    taskReminderEnabled: data.taskReminderEnabled !== false,
    emailNotificationsEnabled: data.emailNotificationsEnabled !== false,
    welcomeEmailsEnabled: data.welcomeEmailsEnabled !== false,
    paymentEmailsEnabled: data.paymentEmailsEnabled !== false,
    planExpiryEmailsEnabled: data.planExpiryEmailsEnabled !== false,
    weeklySummaryEmailsEnabled: data.weeklySummaryEmailsEnabled !== false,
    deletionRequested: Boolean(data.deletionRequested),
    deletionRequestedAt: data.deletionRequestedAt ?? null,
    weekStartDay: Number(data.weekStartDay ?? 0),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null
  };
}

function mapStudyTemplateDoc(id: string, data: DocumentData): StudyTemplate {
  return {
    id,
    userId: String(data.userId ?? ""),
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    type: String(data.type ?? "focus") as StudyTemplateType,
    config: (data.config ?? {}) as StudyTemplateConfig,
    isSystemTemplate: Boolean(data.isSystemTemplate),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null
  };
}

function mapStudyTemplatesSnapshot(snapshot: QuerySnapshot): StudyTemplate[] {
  return sortByCreatedAt(snapshot.docs.map((templateDoc) => mapStudyTemplateDoc(templateDoc.id, templateDoc.data())));
}

function mapDailyReviewDoc(id: string, data: DocumentData): DailyReview {
  return {
    id,
    userId: String(data.userId ?? ""),
    date: String(data.date ?? ""),
    winsText: String(data.winsText ?? ""),
    improveText: String(data.improveText ?? ""),
    tomorrowFocusText: String(data.tomorrowFocusText ?? ""),
    moodRating: Number(data.moodRating ?? 3),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null
  };
}

function mapDailyReviewsSnapshot(snapshot: QuerySnapshot): DailyReview[] {
  return snapshot.docs
    .map((reviewDoc) => mapDailyReviewDoc(reviewDoc.id, reviewDoc.data()))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function mapWeeklyReviewDoc(id: string, data: DocumentData): WeeklyReview {
  return {
    id,
    userId: String(data.userId ?? ""),
    weekKey: String(data.weekKey ?? ""),
    winsText: String(data.winsText ?? ""),
    challengesText: String(data.challengesText ?? ""),
    nextWeekFocusText: String(data.nextWeekFocusText ?? ""),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null
  };
}

function mapWeeklyReviewsSnapshot(snapshot: QuerySnapshot): WeeklyReview[] {
  return snapshot.docs
    .map((reviewDoc) => mapWeeklyReviewDoc(reviewDoc.id, reviewDoc.data()))
    .sort((a, b) => b.weekKey.localeCompare(a.weekKey));
}

function mapStudyReminderDoc(id: string, data: DocumentData): StudyReminder {
  const status = normalizeStudyReminderStatus(data.status, Boolean(data.read));

  return {
    id,
    userId: String(data.userId ?? ""),
    type: normalizeStudyReminderType(data.type),
    title: String(data.title ?? ""),
    message: String(data.message ?? data.notes ?? ""),
    date: String(data.date ?? ""),
    time: getOptionalString(data.time),
    subjectId: getOptionalString(data.subjectId),
    subject: getOptionalString(data.subject),
    linkedRevisionId: getOptionalString(data.linkedRevisionId),
    linkedAssignmentId: getOptionalString(data.linkedAssignmentId),
    linkedExamId: getOptionalString(data.linkedExamId),
    notes: getOptionalString(data.notes),
    status,
    read: status !== "Active",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null
  };
}

function mapStudyRemindersSnapshot(snapshot: QuerySnapshot): StudyReminder[] {
  return snapshot.docs
    .map((reminderDoc) => mapStudyReminderDoc(reminderDoc.id, reminderDoc.data()))
    .sort((a, b) => `${a.date} ${a.time ?? ""}`.localeCompare(`${b.date} ${b.time ?? ""}`));
}

function mapPaymentDoc(id: string, data: DocumentData): PaymentRecord {
  const plan = data.plan === "elite" ? "elite" : "pro";
  const billingCycle = data.billingCycle === "season" || data.billingCycle === "yearly" ? data.billingCycle : "monthly";

  return {
    id,
    userId: String(data.userId ?? ""),
    plan,
    billingCycle,
    amount: Number(data.amount ?? 0),
    currency: "INR",
    razorpayOrderId: String(data.razorpayOrderId ?? id),
    razorpayPaymentId: getOptionalString(data.razorpayPaymentId),
    status: String(data.status ?? "created") as PaymentRecord["status"],
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    verifiedAt: data.verifiedAt ?? null
  };
}

function mapPaymentsSnapshot(snapshot: QuerySnapshot): PaymentRecord[] {
  return snapshot.docs
    .map((paymentDoc) => mapPaymentDoc(paymentDoc.id, paymentDoc.data()))
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;

      return bTime - aTime;
    });
}

function finiteNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function mapMockSubjectBreakdown(data: DocumentData, index: number): MockSubjectBreakdown {
  const score = finiteNumber(data.score);
  const totalMarks = finiteNumber(data.totalMarks);
  const correct = Math.max(0, Math.round(finiteNumber(data.correct ?? data.correctAnswers)));
  const incorrect = Math.max(0, Math.round(finiteNumber(data.incorrect ?? data.wrongAnswers)));
  const attempted = Math.max(0, Math.round(finiteNumber(data.attempted ?? data.attemptedQuestions, correct + incorrect)));
  const skipped = Math.max(0, Math.round(finiteNumber(data.skipped ?? data.skippedQuestions)));

  return {
    id: String(data.id ?? `subject-${index + 1}`),
    subjectId: getOptionalString(data.subjectId),
    subject: String(data.subject ?? "Subject"),
    subjectColor: getOptionalString(data.subjectColor),
    subjectIcon: getOptionalString(data.subjectIcon),
    score,
    totalMarks,
    percentage: totalMarks > 0 ? roundMetric((score / totalMarks) * 100) : finiteNumber(data.percentage),
    attempted,
    correct,
    incorrect,
    skipped,
    accuracy: attempted > 0 ? roundMetric((correct / attempted) * 100) : finiteNumber(data.accuracy),
    timeSpentMinutes: data.timeSpentMinutes === null || data.timeSpentMinutes === undefined || data.timeSpentMinutes === ""
      ? null
      : finiteNumber(data.timeSpentMinutes),
    notes: getOptionalString(data.notes)
  };
}

function mapMockTopicAnalysis(data: DocumentData, index: number): MockTopicAnalysis {
  return {
    id: String(data.id ?? `topic-${index + 1}`),
    subjectId: getOptionalString(data.subjectId),
    subject: String(data.subject ?? "Subject"),
    subjectColor: getOptionalString(data.subjectColor),
    subjectIcon: getOptionalString(data.subjectIcon),
    chapterId: getOptionalString(data.chapterId),
    chapterName: getOptionalString(data.chapterName),
    topicId: getOptionalString(data.topicId),
    topicName: getOptionalString(data.topicName),
    performanceLevel: normalizeMockPerformanceLevel(data.performanceLevel),
    attempted: data.attempted === null || data.attempted === undefined || data.attempted === "" ? null : finiteNumber(data.attempted),
    correct: data.correct === null || data.correct === undefined || data.correct === "" ? null : finiteNumber(data.correct),
    incorrect: data.incorrect === null || data.incorrect === undefined || data.incorrect === "" ? null : finiteNumber(data.incorrect),
    skipped: data.skipped === null || data.skipped === undefined || data.skipped === "" ? null : finiteNumber(data.skipped),
    mistakeTags: normalizeMockMistakeTags(data.mistakeTags),
    notes: getOptionalString(data.notes)
  };
}

function mapMockTimeAnalysis(data: DocumentData): MockTimeAnalysis {
  return {
    totalTimeSpentMinutes: data.totalTimeSpentMinutes === null || data.totalTimeSpentMinutes === undefined || data.totalTimeSpentMinutes === ""
      ? null
      : finiteNumber(data.totalTimeSpentMinutes),
    timePressure: Boolean(data.timePressure),
    slowSubject: getOptionalString(data.slowSubject),
    rushedSubject: getOptionalString(data.rushedSubject),
    notes: getOptionalString(data.notes)
  };
}

function mapMockTestDoc(id: string, data: DocumentData): MockTestResult {
  const score = finiteNumber(data.score);
  const totalMarks = finiteNumber(data.totalMarks);
  const totalQuestions = Math.max(0, Math.round(finiteNumber(data.totalQuestions)));
  const correctAnswers = Math.max(0, Math.round(finiteNumber(data.correctAnswers)));
  const wrongAnswers = Math.max(0, Math.round(finiteNumber(data.wrongAnswers)));
  const attemptedQuestions = Math.max(0, Math.round(finiteNumber(data.attemptedQuestions, correctAnswers + wrongAnswers)));
  const skippedQuestions = Math.max(0, Math.round(finiteNumber(data.skippedQuestions, totalQuestions - attemptedQuestions)));
  const subjectBreakdowns = Array.isArray(data.subjectBreakdowns)
    ? data.subjectBreakdowns.map((item: DocumentData, index: number) => mapMockSubjectBreakdown(item, index))
    : [];
  const fallbackSubjectBreakdowns = subjectBreakdowns.length > 0 || !data.subject
    ? subjectBreakdowns
    : [mapMockSubjectBreakdown({
      id: "overall",
      subjectId: data.subjectId,
      subject: data.subject,
      subjectColor: data.subjectColor,
      subjectIcon: data.subjectIcon,
      score,
      totalMarks,
      attempted: attemptedQuestions,
      correct: correctAnswers,
      incorrect: wrongAnswers,
      skipped: skippedQuestions,
      timeSpentMinutes: data.timeTakenMinutes,
      notes: data.notes
    }, 0)];

  return {
    id,
    userId: String(data.userId ?? ""),
    title: String(data.title ?? ""),
    examType: getOptionalString(normalizeMockExamType(data.examType)),
    subjectId: getOptionalString(data.subjectId),
    subject: getOptionalString(data.subject),
    subjectColor: getOptionalString(data.subjectColor),
    subjectIcon: getOptionalString(data.subjectIcon),
    score,
    totalMarks,
    percentage: totalMarks > 0 ? roundMetric((score / totalMarks) * 100) : finiteNumber(data.percentage),
    percentile: data.percentile === null || data.percentile === undefined || data.percentile === "" ? null : finiteNumber(data.percentile),
    rank: data.rank === null || data.rank === undefined || data.rank === "" ? null : finiteNumber(data.rank),
    totalQuestions,
    attemptedQuestions,
    correctAnswers,
    wrongAnswers,
    skippedQuestions,
    accuracy: attemptedQuestions > 0 ? roundMetric((correctAnswers / attemptedQuestions) * 100) : finiteNumber(data.accuracy),
    timeTakenMinutes: finiteNumber(data.timeTakenMinutes),
    testDate: String(data.testDate ?? ""),
    subjectBreakdowns: fallbackSubjectBreakdowns,
    topicAnalyses: Array.isArray(data.topicAnalyses)
      ? data.topicAnalyses.map((item: DocumentData, index: number) => mapMockTopicAnalysis(item, index))
      : [],
    mistakeTags: normalizeMockMistakeTags(data.mistakeTags),
    timeAnalysis: data.timeAnalysis && typeof data.timeAnalysis === "object" ? mapMockTimeAnalysis(data.timeAnalysis) : undefined,
    notes: getOptionalString(data.notes),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null
  };
}

function mapMockTestsSnapshot(snapshot: QuerySnapshot): MockTestResult[] {
  return snapshot.docs
    .map((testDoc) => mapMockTestDoc(testDoc.id, testDoc.data()))
    .sort((a, b) => b.testDate.localeCompare(a.testDate));
}

function mapStudyGoalDoc(id: string, data: DocumentData): StudyGoal {
  return {
    id,
    userId: String(data.userId ?? ""),
    title: String(data.title ?? ""),
    goalType: String(data.goalType ?? "studyHours") as StudyGoalType,
    targetValue: Number(data.targetValue ?? 0),
    currentValue: Number(data.currentValue ?? 0),
    startDate: String(data.startDate ?? ""),
    targetDate: String(data.targetDate ?? ""),
    linkedSubjectId: getOptionalString(data.linkedSubjectId),
    linkedSubjectName: getOptionalString(data.linkedSubjectName),
    linkedChapterId: getOptionalString(data.linkedChapterId),
    linkedChapterName: getOptionalString(data.linkedChapterName),
    status: String(data.status ?? "active") as StudyGoalStatus,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null
  };
}

function mapStudyGoalsSnapshot(snapshot: QuerySnapshot): StudyGoal[] {
  return snapshot.docs
    .map((goalDoc) => mapStudyGoalDoc(goalDoc.id, goalDoc.data()))
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate));
}

function mapStudyJournalDoc(id: string, data: DocumentData): StudyJournalEntry {
  return {
    id,
    userId: String(data.userId ?? ""),
    sessionId: getOptionalString(data.sessionId),
    taskId: getOptionalString(data.taskId),
    subject: getOptionalString(data.subject),
    title: String(data.title ?? ""),
    studiedText: String(data.studiedText ?? ""),
    struggleText: String(data.struggleText ?? ""),
    nextAction: String(data.nextAction ?? ""),
    moodRating: Number(data.moodRating ?? 3),
    focusRating: Number(data.focusRating ?? 3),
    difficultyRating: Number(data.difficultyRating ?? 3),
    date: String(data.date ?? ""),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null
  };
}

function mapStudyJournalsSnapshot(snapshot: QuerySnapshot): StudyJournalEntry[] {
  return snapshot.docs
    .map((journalDoc) => mapStudyJournalDoc(journalDoc.id, journalDoc.data()))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function createUserDocument(user: User): Promise<void> {
  const db = ensureFirestoreDb();
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    return;
  }

  await setDoc(userRef, {
    id: user.uid,
    email: user.email ?? "",
    createdAt: serverTimestamp()
  } satisfies Omit<AppUser, "createdAt"> & { createdAt: ReturnType<typeof serverTimestamp> });
}

export function subscribeToTodayTasks(
  userId: string,
  onTasks: (tasks: StudyTask[]) => void,
  onError: (error: string) => void
): Unsubscribe {
  const db = ensureFirestoreDb();
  const today = getTodayDateKey();
  const tasksQuery = query(collection(db, "tasks"), where("userId", "==", userId), where("date", "==", today));

  return onSnapshot(
    tasksQuery,
    (snapshot) => onTasks(mapTasksSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export function subscribeToUserTasks(
  userId: string,
  onTasks: (tasks: StudyTask[]) => void,
  onError: (error: string) => void
): Unsubscribe {
  const db = ensureFirestoreDb();
  const tasksQuery = query(collection(db, "tasks"), where("userId", "==", userId), orderBy("createdAt", "desc"), queryLimit(READ_LIMITS.recentTasks));

  return onSnapshot(
    tasksQuery,
    (snapshot) => onTasks(mapTasksSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export function subscribeToTasksByDateRange(
  userId: string,
  startDateKey: string,
  endDateKey: string,
  onTasks: (tasks: StudyTask[]) => void,
  onError: (error: string) => void
): Unsubscribe {
  const db = ensureFirestoreDb();
  const tasksQuery = query(
    collection(db, "tasks"),
    where("userId", "==", userId),
    where("date", ">=", startDateKey),
    where("date", "<=", endDateKey),
    orderBy("date", "desc")
  );

  return onSnapshot(
    tasksQuery,
    (snapshot) => onTasks(mapTasksSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export async function getTasksByDateRange(
  userId: string,
  startDateKey: string,
  endDateKey: string
): Promise<StudyTask[]> {
  const db = ensureFirestoreDb();
  const tasksQuery = query(
    collection(db, "tasks"),
    where("userId", "==", userId),
    where("date", ">=", startDateKey),
    where("date", "<=", endDateKey),
    orderBy("date", "desc")
  );
  return timedFirestoreRead("tasks:dateRange", async () => {
    try {
      const snapshot = await getDocs(tasksQuery);
      return mapTasksSnapshot(snapshot);
    } catch (error) {
      if (!isMissingIndexError(error)) {
        throw error;
      }

      const fallbackSnapshot = await getDocs(query(collection(db, "tasks"), where("userId", "==", userId)));

      return mapTasksSnapshot(fallbackSnapshot).filter((task) => isDateInRange(task.date, startDateKey, endDateKey));
    }
  });
}

export async function fetchUserTasks(userId: string): Promise<StudyTask[]> {
  const db = ensureFirestoreDb();
  const tasksQuery = query(collection(db, "tasks"), where("userId", "==", userId));

  return timedFirestoreRead("tasks:allExport", async () => {
    const snapshot = await getDocs(tasksQuery);
    return mapTasksSnapshot(snapshot);
  });
}

export async function addStudyTask(
  userId: string,
  title: string,
  duration: number,
  subject?: string
): Promise<void> {
  const db = ensureFirestoreDb();
  const trimmedTitle = title.trim();
  const trimmedSubject = subject?.trim() ?? "";

  if (!trimmedTitle) {
    throw new Error("Enter a task title.");
  }

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("Duration must be greater than 0.");
  }

  const taskRef = doc(collection(db, "tasks"));

  await setDoc(taskRef, {
    id: taskRef.id,
    userId,
    title: trimmedTitle,
    duration,
    subject: trimmedSubject,
    completed: false,
    date: getTodayDateKey(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    completedAt: null
  });
}

export async function markStudyTaskCompleted(taskId: string): Promise<void> {
  const db = ensureFirestoreDb();

  await updateDoc(doc(db, "tasks", taskId), {
    completed: true,
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function deleteStudyTask(taskId: string): Promise<void> {
  const db = ensureFirestoreDb();

  await deleteDoc(doc(db, "tasks", taskId));
}

export function subscribeToTodaySessions(
  userId: string,
  onSessions: (sessions: StudySession[]) => void,
  onError: (error: string) => void
): Unsubscribe {
  const db = ensureFirestoreDb();
  const today = getTodayDateKey();
  const sessionsQuery = query(collection(db, "sessions"), where("userId", "==", userId), where("date", "==", today));

  return onSnapshot(
    sessionsQuery,
    (snapshot) => onSessions(mapSessionsSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export function subscribeToSessionsByDateRange(
  userId: string,
  startDateKey: string,
  endDateKey: string,
  onSessions: (sessions: StudySession[]) => void,
  onError: (error: string) => void
): Unsubscribe {
  const db = ensureFirestoreDb();
  const sessionsQuery = query(
    collection(db, "sessions"),
    where("userId", "==", userId),
    where("date", ">=", startDateKey),
    where("date", "<=", endDateKey),
    orderBy("date", "desc")
  );

  return onSnapshot(
    sessionsQuery,
    (snapshot) => onSessions(mapSessionsSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export function subscribeToUserSessions(
  userId: string,
  onSessions: (sessions: StudySession[]) => void,
  onError: (error: string) => void
): Unsubscribe {
  const db = ensureFirestoreDb();
  const sessionsQuery = query(collection(db, "sessions"), where("userId", "==", userId), orderBy("date", "desc"), queryLimit(READ_LIMITS.recentSessions));

  return onSnapshot(
    sessionsQuery,
    (snapshot) => onSessions(mapSessionsSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export async function getSessionsByDateRange(
  userId: string,
  startDateKey: string,
  endDateKey: string
): Promise<StudySession[]> {
  const db = ensureFirestoreDb();
  const sessionsQuery = query(
    collection(db, "sessions"),
    where("userId", "==", userId),
    where("date", ">=", startDateKey),
    where("date", "<=", endDateKey),
    orderBy("date", "desc")
  );
  return timedFirestoreRead("sessions:dateRange", async () => {
    try {
      const snapshot = await getDocs(sessionsQuery);
      return mapSessionsSnapshot(snapshot);
    } catch (error) {
      if (!isMissingIndexError(error)) {
        throw error;
      }

      const fallbackSnapshot = await getDocs(query(collection(db, "sessions"), where("userId", "==", userId)));

      return mapSessionsSnapshot(fallbackSnapshot).filter((session) => isDateInRange(session.date, startDateKey, endDateKey));
    }
  });
}

export async function fetchUserSessions(userId: string): Promise<StudySession[]> {
  const db = ensureFirestoreDb();
  const sessionsQuery = query(collection(db, "sessions"), where("userId", "==", userId));

  return timedFirestoreRead("sessions:allExport", async () => {
    const snapshot = await getDocs(sessionsQuery);
    return mapSessionsSnapshot(snapshot);
  });
}

export function subscribeToStreak(
  userId: string,
  onStreak: (streak: StudyStreak | null) => void,
  onError: (error: string) => void
): Unsubscribe {
  const db = ensureFirestoreDb();

  return onSnapshot(
    doc(db, "streaks", userId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onStreak(null);
        return;
      }

      onStreak(mapStreak(snapshot.data()));
    },
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export async function fetchStreak(userId: string): Promise<StudyStreak | null> {
  const db = ensureFirestoreDb();

  const startedAt =
    typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
  const snapshot = await getDoc(doc(db, "streaks", userId));
  const finishedAt =
    typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();

  logFirestoreRead("streak:single", finishedAt - startedAt, snapshot.exists() ? 1 : 0);
  return snapshot.exists() ? mapStreak(snapshot.data()) : null;
}

function parseFocusTimestamp(value: string, label: string): Timestamp {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} is not a valid time.`);
  }

  return Timestamp.fromDate(date);
}

function normalizeFocusSessionInput(input: FocusSessionInput): FocusSessionInput & {
  startedAt: Timestamp;
  endedAt: Timestamp;
  date: string;
} {
  const taskTitle = input.taskTitle.trim() || "Focus session";
  const plannedDuration = Math.round(Number(input.plannedDuration));
  const actualDuration = Math.max(0, Math.round(Number(input.actualDuration)));
  const status = normalizeFocusSessionStatus(input.status);
  const startedAt = parseFocusTimestamp(input.startedAtIso, "Start time");
  const endedAt = parseFocusTimestamp(input.endedAtIso ?? new Date().toISOString(), "End time");

  if (!Number.isFinite(plannedDuration) || plannedDuration <= 0) {
    throw new Error("Planned focus duration must be greater than 0.");
  }

  if (!Number.isFinite(actualDuration) || (status === "completed" && actualDuration <= 0)) {
    throw new Error("Actual focus duration must be greater than 0 for completed sessions.");
  }

  return {
    ...input,
    taskId: input.taskId?.trim() ?? "",
    taskTitle,
    subject: input.subject?.trim() ?? "",
    subjectId: input.subjectId?.trim() ?? "",
    revisionPlanId: input.revisionPlanId?.trim() ?? "",
    assignmentId: input.assignmentId?.trim() ?? "",
    backlogItemId: input.backlogItemId?.trim() ?? "",
    sourceType: input.sourceType?.trim() ?? "",
    sourceId: input.sourceId?.trim() ?? "",
    battlePlanId: input.battlePlanId?.trim() ?? "",
    battlePlanItemId: input.battlePlanItemId?.trim() ?? "",
    chapterId: input.chapterId?.trim() ?? "",
    topicId: input.topicId?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
    plannedDuration,
    actualDuration,
    status,
    startedAt,
    endedAt,
    date: getDateKey(startedAt.toDate())
  };
}

export async function saveFocusSession(userId: string, input: FocusSessionInput): Promise<void> {
  const db = ensureFirestoreDb();
  const normalized = normalizeFocusSessionInput(input);
  const sessionRef = doc(collection(db, "sessions"));
  const taskRef = normalized.taskId ? doc(db, "tasks", normalized.taskId) : null;
  const streakRef = doc(db, "streaks", userId);

  await runTransaction(db, async (transaction) => {
    const taskSnapshot = taskRef ? await transaction.get(taskRef) : null;
    const streakSnapshot = normalized.status === "completed" ? await transaction.get(streakRef) : null;

    if (taskRef && !taskSnapshot?.exists()) {
      throw new Error("This task no longer exists.");
    }

    const taskData = taskSnapshot?.data();

    if (taskData && taskData.userId !== userId) {
      throw new Error("You can only save sessions for your own tasks.");
    }

    const subject = getOptionalString(taskData?.subject ?? normalized.subject) ?? "";
    const taskTitle = taskData ? String(taskData.title ?? normalized.taskTitle) : normalized.taskTitle;

    transaction.set(sessionRef, {
      id: sessionRef.id,
      userId,
      taskId: normalized.taskId ?? "",
      taskTitle,
      subjectId: normalized.subjectId ?? "",
      subject,
      duration: normalized.actualDuration,
      plannedDuration: normalized.plannedDuration,
      actualDuration: normalized.actualDuration,
      startedAt: normalized.startedAt,
      endedAt: normalized.endedAt,
      status: normalized.status,
      revisionPlanId: normalized.revisionPlanId ?? "",
      assignmentId: normalized.assignmentId ?? "",
      backlogItemId: normalized.backlogItemId ?? "",
      sourceType: normalized.sourceType ?? "",
      sourceId: normalized.sourceId ?? "",
      battlePlanId: normalized.battlePlanId ?? "",
      battlePlanItemId: normalized.battlePlanItemId ?? "",
      chapterId: normalized.chapterId ?? "",
      topicId: normalized.topicId ?? "",
      notes: normalized.notes ?? "",
      completedAt: normalized.status === "completed" ? serverTimestamp() : null,
      date: normalized.date,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    if (taskRef && normalized.status === "completed") {
      transaction.update(taskRef, {
        completed: true,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    if (normalized.status === "completed") {
      const currentStreak = streakSnapshot?.exists() ? mapStreak(streakSnapshot.data()) : null;
      const nextStreak = getNextStreakState(currentStreak, normalized.date);

      transaction.set(streakRef, {
        userId,
        currentStreak: nextStreak.currentStreak,
        longestStreak: nextStreak.longestStreak,
        lastActiveDate: nextStreak.lastActiveDate,
        updatedAt: serverTimestamp()
      });
    }
  });
}

export async function saveCompletedFocusSession(userId: string, task: StudyTask): Promise<void> {
  const db = ensureFirestoreDb();
  const today = getTodayDateKey();
  const taskRef = doc(db, "tasks", task.id);
  const sessionRef = doc(collection(db, "sessions"));
  const streakRef = doc(db, "streaks", userId);

  await runTransaction(db, async (transaction) => {
    const [taskSnapshot, streakSnapshot] = await Promise.all([
      transaction.get(taskRef),
      transaction.get(streakRef)
    ]);

    if (!taskSnapshot.exists()) {
      throw new Error("This task no longer exists.");
    }

    const taskData = taskSnapshot.data();

    if (taskData.userId !== userId) {
      throw new Error("You can only save sessions for your own tasks.");
    }

    const currentStreak = streakSnapshot.exists() ? mapStreak(streakSnapshot.data()) : null;
    const nextStreak = getNextStreakState(currentStreak, today);
    const subject = getOptionalString(taskData.subject ?? task.subject);

    transaction.set(sessionRef, {
      id: sessionRef.id,
      userId,
      taskId: task.id,
      taskTitle: String(taskData.title ?? task.title),
      subject: subject ?? "",
      duration: Number(taskData.duration ?? task.duration),
      plannedDuration: Number(taskData.duration ?? task.duration),
      actualDuration: Number(taskData.duration ?? task.duration),
      startedAt: serverTimestamp(),
      endedAt: serverTimestamp(),
      status: "completed",
      completedAt: serverTimestamp(),
      date: today,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    transaction.update(taskRef, {
      completed: true,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    transaction.set(streakRef, {
      userId,
      currentStreak: nextStreak.currentStreak,
      longestStreak: nextStreak.longestStreak,
      lastActiveDate: nextStreak.lastActiveDate,
      updatedAt: serverTimestamp()
    });
  });
}

export function subscribeToNotes(
  userId: string,
  onNotes: (notes: StudyNote[]) => void,
  onError: (error: string) => void,
  maxResults: number = READ_LIMITS.notesPage
): Unsubscribe {
  const db = ensureFirestoreDb();
  const notesQuery = query(
    collection(db, "notes"),
    where("userId", "==", userId),
    orderBy("updatedAt", "desc"),
    queryLimit(maxResults)
  );

  return onSnapshot(
    notesQuery,
    (snapshot) => onNotes(mapNotesSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export async function fetchNotes(userId: string): Promise<StudyNote[]> {
  const db = ensureFirestoreDb();
  const notesQuery = query(collection(db, "notes"), where("userId", "==", userId));

  return timedFirestoreRead("notes:allExport", async () => {
    const snapshot = await getDocs(notesQuery);
    return mapNotesSnapshot(snapshot);
  });
}

function normalizeNoteInput(input: StudyNoteInput): StudyNoteInput {
  const title = input.title.trim();
  const content = input.content.trim();
  const subject = input.subject?.trim() ?? "";
  const linkedTaskId = input.linkedTaskId?.trim() ?? "";
  const linkedTaskTitle = input.linkedTaskTitle?.trim() ?? "";

  if (!title) {
    throw new Error("Enter a note title.");
  }

  return {
    title,
    content,
    subject,
    linkedTaskId,
    linkedTaskTitle
  };
}

export async function addStudyNote(userId: string, input: StudyNoteInput): Promise<string> {
  const db = ensureFirestoreDb();
  const noteRef = doc(collection(db, "notes"));
  const normalized = normalizeNoteInput(input);

  await setDoc(noteRef, {
    id: noteRef.id,
    userId,
    ...normalized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return noteRef.id;
}

export async function updateStudyNote(noteId: string, input: StudyNoteInput): Promise<void> {
  const db = ensureFirestoreDb();
  const normalized = normalizeNoteInput(input);

  await updateDoc(doc(db, "notes", noteId), {
    ...normalized,
    updatedAt: serverTimestamp()
  });
}

export async function deleteStudyNote(noteId: string): Promise<void> {
  const db = ensureFirestoreDb();

  await deleteDoc(doc(db, "notes", noteId));
}

const TIMETABLE_CLASS_TYPES: TimetableClassType[] = ["School", "Coaching", "Self-study", "Online", "Other"];
const ASSIGNMENT_PRIORITIES: AssignmentPriority[] = ["Low", "Medium", "High"];
const ASSIGNMENT_STATUSES: AssignmentStatus[] = ["Pending", "In Progress", "Completed"];
const REVISION_TYPES: RevisionType[] = ["Theory", "Formula", "Question Practice", "Mistake Review", "Full Chapter"];
const REVISION_STATUSES: RevisionStatus[] = ["Pending", "Done", "Skipped"];
const TOPIC_STUDY_STATUSES: TopicStudyStatus[] = ["Not Started", "Learning", "Revised Once", "Weak", "Backlog", "Strong", "Completed"];
const BACKLOG_LEVELS: BacklogLevel[] = ["Light", "Medium", "Heavy"];
const BACKLOG_REASONS: BacklogReason[] = ["Missed Class", "Weak Concept", "Low Marks", "Not Revised", "Homework Pending", "Other"];
const BACKLOG_STATUSES: BacklogStatus[] = ["Not Started", "In Progress", "Cleared"];
const BATTLE_PLAN_ITEM_TYPES: DailyBattlePlanItem["type"][] = ["Homework", "Revision", "Backlog", "Exam Prep", "Weak Topic", "Focus Session", "General Study"];
const BATTLE_PLAN_ITEM_STATUSES: BattlePlanItemStatus[] = ["Pending", "Done", "Skipped"];
const BATTLE_PLAN_SOURCE_TYPES: DailyBattlePlanItem["sourceType"][] = ["assignment", "revision", "backlog", "exam", "marks", "mockTest", "topic", "general"];
const MOCK_EXAM_TYPES: MockExamType[] = ["JEE Main", "JEE Advanced", "NEET", "Boards", "School", "Coaching", "Custom"];
const MOCK_PERFORMANCE_LEVELS: MockPerformanceLevel[] = ["Strong", "Average", "Weak", "Critical"];
const MOCK_MISTAKE_TAGS: MockMistakeTag[] = [
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
const FOCUS_SESSION_STATUSES: FocusSessionStatus[] = ["completed", "abandoned", "paused"];
const REMINDER_TYPES: StudyReminderType[] = [
  "task",
  "revision",
  "homework",
  "exam",
  "general-study",
  "habit",
  "goal",
  "daily-study"
];
const REMINDER_STATUSES: StudyReminderStatus[] = ["Active", "Done", "Dismissed"];

function normalizeTimetableClassType(value: unknown): TimetableClassType {
  return TIMETABLE_CLASS_TYPES.includes(value as TimetableClassType)
    ? (value as TimetableClassType)
    : "Self-study";
}

function normalizeAssignmentPriority(value: unknown): AssignmentPriority {
  return ASSIGNMENT_PRIORITIES.includes(value as AssignmentPriority)
    ? (value as AssignmentPriority)
    : "Medium";
}

function normalizeAssignmentStatus(value: unknown): AssignmentStatus {
  return ASSIGNMENT_STATUSES.includes(value as AssignmentStatus)
    ? (value as AssignmentStatus)
    : "Pending";
}

function normalizeRevisionType(value: unknown): RevisionType {
  return REVISION_TYPES.includes(value as RevisionType) ? (value as RevisionType) : "Theory";
}

function normalizeRevisionStatus(value: unknown, completed = false): RevisionStatus {
  if (REVISION_STATUSES.includes(value as RevisionStatus)) {
    return value as RevisionStatus;
  }

  return completed ? "Done" : "Pending";
}

function normalizeTopicStudyStatus(value: unknown, completed = false): TopicStudyStatus {
  if (TOPIC_STUDY_STATUSES.includes(value as TopicStudyStatus)) {
    return value as TopicStudyStatus;
  }

  return completed ? "Completed" : "Not Started";
}

function normalizeBacklogLevel(value: unknown): BacklogLevel {
  return BACKLOG_LEVELS.includes(value as BacklogLevel) ? (value as BacklogLevel) : "Medium";
}

function normalizeBacklogReason(value: unknown): BacklogReason {
  return BACKLOG_REASONS.includes(value as BacklogReason) ? (value as BacklogReason) : "Other";
}

function normalizeBacklogStatus(value: unknown): BacklogStatus {
  return BACKLOG_STATUSES.includes(value as BacklogStatus) ? (value as BacklogStatus) : "Not Started";
}

function normalizeBattlePlanItemType(value: unknown): DailyBattlePlanItem["type"] {
  return BATTLE_PLAN_ITEM_TYPES.includes(value as DailyBattlePlanItem["type"])
    ? (value as DailyBattlePlanItem["type"])
    : "General Study";
}

function normalizeBattlePlanPriority(value: unknown): DailyBattlePlanItem["priority"] {
  return ASSIGNMENT_PRIORITIES.includes(value as AssignmentPriority)
    ? (value as DailyBattlePlanItem["priority"])
    : "Medium";
}

function normalizeBattlePlanItemStatus(value: unknown): BattlePlanItemStatus {
  return BATTLE_PLAN_ITEM_STATUSES.includes(value as BattlePlanItemStatus) ? (value as BattlePlanItemStatus) : "Pending";
}

function normalizeBattlePlanSourceType(value: unknown): DailyBattlePlanItem["sourceType"] {
  return BATTLE_PLAN_SOURCE_TYPES.includes(value as DailyBattlePlanItem["sourceType"])
    ? (value as DailyBattlePlanItem["sourceType"])
    : "general";
}

function normalizeMockExamType(value: unknown): MockExamType | string {
  const text = String(value ?? "").trim();

  if (!text) {
    return "Custom";
  }

  return MOCK_EXAM_TYPES.includes(text as MockExamType) ? (text as MockExamType) : text;
}

function normalizeMockPerformanceLevel(value: unknown): MockPerformanceLevel {
  return MOCK_PERFORMANCE_LEVELS.includes(value as MockPerformanceLevel)
    ? (value as MockPerformanceLevel)
    : "Average";
}

function normalizeMockMistakeTags(value: unknown): MockMistakeTag[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item ?? "").trim())
    .filter((item): item is MockMistakeTag => MOCK_MISTAKE_TAGS.includes(item as MockMistakeTag));
}

function normalizeFocusSessionStatus(value: unknown): FocusSessionStatus {
  return FOCUS_SESSION_STATUSES.includes(value as FocusSessionStatus) ? (value as FocusSessionStatus) : "completed";
}

function normalizeStudyReminderType(value: unknown): StudyReminderType {
  return REMINDER_TYPES.includes(value as StudyReminderType) ? (value as StudyReminderType) : "daily-study";
}

function normalizeStudyReminderStatus(value: unknown, read = false): StudyReminderStatus {
  if (REMINDER_STATUSES.includes(value as StudyReminderStatus)) {
    return value as StudyReminderStatus;
  }

  return read ? "Dismissed" : "Active";
}

function normalizeOptionalPositiveNumber(value: number | string | null | undefined, label: string): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new Error(`${label} must be greater than 0.`);
  }

  return Math.round(numberValue);
}

function normalizeTimetableBlockInput(input: TimetableBlockInput): TimetableBlockInput & { duration: number } {
  const subject = input.subject.trim();
  const classType = normalizeTimetableClassType(input.classType);
  const title = input.title?.trim() || `${subject} ${classType}`;
  const subjectId = input.subjectId?.trim() ?? "";
  const teacherName = input.teacherName?.trim() ?? "";
  const location = input.location?.trim() ?? "";
  const notes = input.notes?.trim() ?? "";
  const dayOfWeek = Number(input.dayOfWeek);
  const duration = getDurationBetweenTimes(input.startTime, input.endTime);
  const date = input.date?.trim() ?? "";
  const scheduleMode = normalizeTimetableScheduleMode(input.scheduleMode);
  const cycleLength = input.cycleLength === null || input.cycleLength === undefined || input.cycleLength === ""
    ? null
    : normalizeCycleLength(input.cycleLength);
  const cycleDayNumber = input.cycleDayNumber === null || input.cycleDayNumber === undefined || input.cycleDayNumber === ""
    ? null
    : normalizeCycleDay(input.cycleDayNumber, cycleLength ?? 5);

  if (!title) {
    throw new Error("Enter a study block title.");
  }

  if (!subject) {
    throw new Error("Enter a subject.");
  }

  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error("Choose a valid day.");
  }

  if (!input.startTime || !input.endTime || !Number.isFinite(duration) || duration <= 0) {
    throw new Error("End time must be after start time.");
  }

  if (!input.isRecurring && !date) {
    throw new Error("Choose a date for one-off blocks.");
  }

  if (scheduleMode === "dayCycle" && !cycleDayNumber) {
    throw new Error("Choose a cycle day for this entry.");
  }

  return normalizeTimetableBlockSchedule({
    title,
    subjectId,
    subject,
    classType,
    dayOfWeek,
    date,
    startTime: input.startTime,
    endTime: input.endTime,
    teacherName,
    location,
    notes,
    isRecurring: input.isRecurring,
    duration,
    scheduleMode,
    scheduleProfileId: input.scheduleProfileId?.trim() || DEFAULT_SCHEDULE_PROFILE_ID,
    scheduleProfileName: input.scheduleProfileName?.trim() || DEFAULT_SCHEDULE_PROFILE_NAME,
    weekGroup: normalizeTimetableWeekGroup(input.weekGroup),
    cycleDayNumber,
    cycleLength,
    effectiveFrom: input.effectiveFrom?.trim() ?? "",
    effectiveUntil: input.effectiveUntil?.trim() ?? "",
    isActive: input.isActive !== false,
    conflictIgnored: Boolean(input.conflictIgnored)
  }) as TimetableBlockInput & { duration: number };
}

export function subscribeToTimetableBlocks(
  userId: string,
  onBlocks: (blocks: TimetableBlock[]) => void,
  onError: (error: string) => void
): Unsubscribe {
  const db = ensureFirestoreDb();
  const blocksQuery = query(collection(db, "timetableBlocks"), where("userId", "==", userId));

  return onSnapshot(
    blocksQuery,
    (snapshot) => onBlocks(mapTimetableBlocksSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export async function fetchTimetableBlocks(userId: string): Promise<TimetableBlock[]> {
  const db = ensureFirestoreDb();
  const blocksQuery = query(collection(db, "timetableBlocks"), where("userId", "==", userId));

  return timedFirestoreRead("timetable:allExport", async () => {
    const snapshot = await getDocs(blocksQuery);
    return mapTimetableBlocksSnapshot(snapshot);
  });
}

export async function addTimetableBlock(userId: string, input: TimetableBlockInput): Promise<void> {
  const db = ensureFirestoreDb();
  const blockRef = doc(collection(db, "timetableBlocks"));
  const normalized = normalizeTimetableBlockInput(input);

  await setDoc(blockRef, {
    id: blockRef.id,
    userId,
    ...normalized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateTimetableBlock(blockId: string, input: TimetableBlockInput): Promise<void> {
  const db = ensureFirestoreDb();
  const normalized = normalizeTimetableBlockInput(input);

  await updateDoc(doc(db, "timetableBlocks", blockId), {
    ...normalized,
    updatedAt: serverTimestamp()
  });
}

export async function deleteTimetableBlock(blockId: string): Promise<void> {
  const db = ensureFirestoreDb();

  await deleteDoc(doc(db, "timetableBlocks", blockId));
}

function normalizeScheduleProfileInput(input: ScheduleProfileInput): Omit<ScheduleProfile, "id" | "userId" | "isActive" | "createdAt" | "updatedAt"> {
  const name = input.name.trim();
  const scheduleMode = normalizeTimetableScheduleMode(input.scheduleMode);
  const cycleLength = normalizeCycleLength(input.cycleLength);
  const activeCycleDay = normalizeCycleDay(input.activeCycleDay, cycleLength);

  if (!name) {
    throw new Error("Enter a schedule profile name.");
  }

  return {
    name,
    type: normalizeScheduleProfileType(input.type),
    color: input.color?.trim() ?? "",
    description: input.description?.trim() ?? "",
    scheduleMode,
    activeWeek: input.activeWeek === "B" ? "B" : "A",
    cycleLength,
    activeCycleDay
  };
}

export function subscribeToScheduleProfiles(
  userId: string,
  onProfiles: (profiles: ScheduleProfile[]) => void,
  onError: (error: string) => void
): Unsubscribe {
  const db = ensureFirestoreDb();
  const profilesQuery = query(collection(db, "scheduleProfiles"), where("userId", "==", userId));

  return onSnapshot(
    profilesQuery,
    (snapshot) => onProfiles(mapScheduleProfilesSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export async function fetchScheduleProfiles(userId: string): Promise<ScheduleProfile[]> {
  const db = ensureFirestoreDb();
  const profilesQuery = query(collection(db, "scheduleProfiles"), where("userId", "==", userId));

  return timedFirestoreRead("scheduleProfiles:allExport", async () => {
    const snapshot = await getDocs(profilesQuery);
    return mapScheduleProfilesSnapshot(snapshot);
  });
}

export async function addScheduleProfile(userId: string, input: ScheduleProfileInput): Promise<void> {
  const db = ensureFirestoreDb();
  const profileRef = doc(collection(db, "scheduleProfiles"));
  const normalized = normalizeScheduleProfileInput(input);

  await setDoc(profileRef, {
    id: profileRef.id,
    userId,
    ...normalized,
    isActive: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateScheduleProfile(profileId: string, input: ScheduleProfileInput): Promise<void> {
  const db = ensureFirestoreDb();
  const normalized = normalizeScheduleProfileInput(input);

  await updateDoc(doc(db, "scheduleProfiles", profileId), {
    ...normalized,
    updatedAt: serverTimestamp()
  });
}

export async function setActiveScheduleProfile(userId: string, profileId: string): Promise<void> {
  const db = ensureFirestoreDb();

  if (profileId === DEFAULT_SCHEDULE_PROFILE_ID) {
    const profilesSnapshot = await getDocs(query(collection(db, "scheduleProfiles"), where("userId", "==", userId)));
    const batch = writeBatch(db);

    profilesSnapshot.docs.forEach((profileDoc) => {
      batch.update(profileDoc.ref, { isActive: false, updatedAt: serverTimestamp() });
    });

    await batch.commit();
    return;
  }

  const profilesSnapshot = await getDocs(query(collection(db, "scheduleProfiles"), where("userId", "==", userId)));
  const batch = writeBatch(db);

  profilesSnapshot.docs.forEach((profileDoc) => {
    batch.update(profileDoc.ref, {
      isActive: profileDoc.id === profileId,
      updatedAt: serverTimestamp()
    });
  });

  await batch.commit();
}

export async function deleteScheduleProfile(userId: string, profileId: string): Promise<void> {
  const db = ensureFirestoreDb();
  const profilesSnapshot = await getDocs(query(collection(db, "scheduleProfiles"), where("userId", "==", userId)));
  const target = profilesSnapshot.docs.find((profileDoc) => profileDoc.id === profileId);

  if (!target) {
    return;
  }

  const remaining = profilesSnapshot.docs.filter((profileDoc) => profileDoc.id !== profileId);
  const targetWasActive = Boolean(target.data().isActive);
  const batch = writeBatch(db);

  batch.delete(target.ref);

  if (targetWasActive && remaining.length > 0) {
    const nextActive = remaining.find((profileDoc) => Boolean(profileDoc.data().isActive)) ?? remaining[0];

    remaining.forEach((profileDoc) => {
      batch.update(profileDoc.ref, {
        isActive: profileDoc.id === nextActive.id,
        updatedAt: serverTimestamp()
      });
    });
  }

  await batch.commit();
}

function normalizeStudyAssignmentInput(
  input: StudyAssignmentInput
): Omit<StudyAssignment, "id" | "userId" | "createdAt" | "updatedAt" | "completedAt"> & { completedAt?: null } {
  const title = input.title.trim();
  const subject = input.subject.trim();
  const dueDate = input.dueDate.trim();
  const status = normalizeAssignmentStatus(input.status);

  if (!title) {
    throw new Error("Enter an assignment title.");
  }

  if (!subject) {
    throw new Error("Choose a subject.");
  }

  if (!dueDate) {
    throw new Error("Choose a due date.");
  }

  return {
    title,
    subjectId: input.subjectId?.trim() ?? "",
    subject,
    dueDate,
    priority: normalizeAssignmentPriority(input.priority),
    status,
    estimatedMinutes: normalizeOptionalPositiveNumber(input.estimatedMinutes, "Estimated time"),
    notes: input.notes?.trim() ?? "",
    ...(status === "Completed" ? {} : { completedAt: null })
  };
}

export function subscribeToAssignments(
  userId: string,
  onAssignments: (assignments: StudyAssignment[]) => void,
  onError: (error: string) => void
): Unsubscribe {
  const db = ensureFirestoreDb();
  const assignmentsQuery = query(collection(db, "assignments"), where("userId", "==", userId));

  return onSnapshot(
    assignmentsQuery,
    (snapshot) => onAssignments(mapStudyAssignmentsSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export async function fetchAssignments(userId: string): Promise<StudyAssignment[]> {
  const db = ensureFirestoreDb();
  const assignmentsQuery = query(collection(db, "assignments"), where("userId", "==", userId));

  return timedFirestoreRead("assignments:allExport", async () => {
    const snapshot = await getDocs(assignmentsQuery);
    return mapStudyAssignmentsSnapshot(snapshot);
  });
}

export async function addAssignment(userId: string, input: StudyAssignmentInput): Promise<void> {
  const db = ensureFirestoreDb();
  const assignmentRef = doc(collection(db, "assignments"));
  const normalized = normalizeStudyAssignmentInput(input);

  await setDoc(assignmentRef, {
    id: assignmentRef.id,
    userId,
    ...normalized,
    completedAt: normalized.status === "Completed" ? serverTimestamp() : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateAssignment(assignmentId: string, input: StudyAssignmentInput): Promise<void> {
  const db = ensureFirestoreDb();
  const normalized = normalizeStudyAssignmentInput(input);

  await updateDoc(doc(db, "assignments", assignmentId), {
    ...normalized,
    ...(normalized.status === "Completed" ? { completedAt: serverTimestamp() } : { completedAt: null }),
    updatedAt: serverTimestamp()
  });
}

export async function setAssignmentStatus(assignmentId: string, status: AssignmentStatus): Promise<void> {
  const db = ensureFirestoreDb();
  const normalizedStatus = normalizeAssignmentStatus(status);

  await updateDoc(doc(db, "assignments", assignmentId), {
    status: normalizedStatus,
    completedAt: normalizedStatus === "Completed" ? serverTimestamp() : null,
    updatedAt: serverTimestamp()
  });
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  const db = ensureFirestoreDb();

  await deleteDoc(doc(db, "assignments", assignmentId));
}

function normalizeExamScheduleInput(
  input: ExamScheduleInput
): Omit<ExamSchedule, "id" | "userId" | "createdAt" | "updatedAt"> {
  const name = input.name.trim();
  const date = input.date.trim();
  const fullSyllabus = Boolean(input.fullSyllabus);
  const subject = input.subject?.trim() ?? "";

  if (!name) {
    throw new Error("Enter an exam or test name.");
  }

  if (!date) {
    throw new Error("Choose an exam date.");
  }

  if (!fullSyllabus && !subject) {
    throw new Error("Choose a subject or mark this as full syllabus.");
  }

  return {
    name,
    subjectId: fullSyllabus ? "" : input.subjectId?.trim() ?? "",
    subject: fullSyllabus ? "" : subject,
    fullSyllabus,
    date,
    startTime: input.startTime?.trim() ?? "",
    durationMinutes: normalizeOptionalPositiveNumber(input.durationMinutes, "Duration"),
    totalMarks: normalizeOptionalPositiveNumber(input.totalMarks, "Total marks"),
    syllabusNotes: input.syllabusNotes?.trim() ?? "",
    notes: input.notes?.trim() ?? ""
  };
}

export function subscribeToExamSchedules(
  userId: string,
  onExams: (exams: ExamSchedule[]) => void,
  onError: (error: string) => void
): Unsubscribe {
  const db = ensureFirestoreDb();
  const examsQuery = query(collection(db, "examSchedules"), where("userId", "==", userId));

  return onSnapshot(
    examsQuery,
    (snapshot) => onExams(mapExamSchedulesSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export async function fetchExamSchedules(userId: string): Promise<ExamSchedule[]> {
  const db = ensureFirestoreDb();
  const examsQuery = query(collection(db, "examSchedules"), where("userId", "==", userId));

  return timedFirestoreRead("examSchedules:allExport", async () => {
    const snapshot = await getDocs(examsQuery);
    return mapExamSchedulesSnapshot(snapshot);
  });
}

export async function addExamSchedule(userId: string, input: ExamScheduleInput): Promise<void> {
  const db = ensureFirestoreDb();
  const examRef = doc(collection(db, "examSchedules"));
  const normalized = normalizeExamScheduleInput(input);

  await setDoc(examRef, {
    id: examRef.id,
    userId,
    ...normalized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateExamSchedule(examId: string, input: ExamScheduleInput): Promise<void> {
  const db = ensureFirestoreDb();
  const normalized = normalizeExamScheduleInput(input);

  await updateDoc(doc(db, "examSchedules", examId), {
    ...normalized,
    updatedAt: serverTimestamp()
  });
}

export async function deleteExamSchedule(examId: string): Promise<void> {
  const db = ensureFirestoreDb();

  await deleteDoc(doc(db, "examSchedules", examId));
}

function normalizeOptionalNonNegativeNumber(value: number | string | null | undefined, label: string): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new Error(`${label} cannot be negative.`);
  }

  return Math.round(numberValue * 10) / 10;
}

function normalizeOptionalPercentile(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0 || numberValue > 100) {
    throw new Error("Percentile must be between 0 and 100.");
  }

  return Math.round(numberValue * 10) / 10;
}

function normalizeMarksEntryInput(input: MarksEntryInput): Omit<MarksEntry, "id" | "userId" | "createdAt" | "updatedAt"> {
  const testName = input.testName.trim();
  const subjectId = input.subjectId?.trim() ?? "";
  const subject = input.subject?.trim() ?? "";
  const examScheduleId = input.examScheduleId?.trim() ?? "";
  const scope = normalizeMarksEntryScope(input.scope);
  const date = input.date.trim();
  const score = Number(input.score);
  const totalMarks = Number(input.totalMarks);
  const rank = normalizeOptionalNonNegativeNumber(input.rank, "Rank");
  const percentile = normalizeOptionalPercentile(input.percentile);
  const durationMinutes = normalizeOptionalPositiveNumber(input.durationMinutes, "Duration");

  if (!testName) {
    throw new Error("Enter a test or result name.");
  }

  if (!date) {
    throw new Error("Choose a result date.");
  }

  if (input.score === "") {
    throw new Error("Enter the score obtained.");
  }

  if (input.totalMarks === "") {
    throw new Error("Enter total marks.");
  }

  if (requiresSubjectForScope(scope) && !subject) {
    throw new Error("Choose a subject for this result scope.");
  }

  if (!Number.isFinite(score) || score < 0) {
    throw new Error("Score cannot be negative.");
  }

  if (!Number.isFinite(totalMarks) || totalMarks <= 0) {
    throw new Error("Total marks must be greater than 0.");
  }

  if (score > totalMarks) {
    throw new Error("Score cannot exceed total marks.");
  }

  return {
    testName,
    subjectId,
    subject,
    examScheduleId,
    scope,
    date,
    score: Math.round(score * 10) / 10,
    totalMarks: Math.round(totalMarks * 10) / 10,
    percentage: calculateMarksPercentage(score, totalMarks),
    rank,
    percentile,
    durationMinutes,
    mistakeTags: normalizeMistakeTags(input.mistakeTags),
    mistakeNotes: input.mistakeNotes?.trim() ?? "",
    notes: input.notes?.trim() ?? ""
  };
}

export function subscribeToMarksEntries(
  userId: string,
  onEntries: (entries: MarksEntry[]) => void,
  onError: (error: string) => void,
  maxResults: number = READ_LIMITS.marksEntriesPage
): Unsubscribe {
  const db = ensureFirestoreDb();
  const entriesQuery = query(
    collection(db, "marksEntries"),
    where("userId", "==", userId),
    orderBy("date", "desc"),
    queryLimit(maxResults)
  );

  return onSnapshot(
    entriesQuery,
    (snapshot) => onEntries(mapMarksEntriesSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export async function fetchMarksEntries(userId: string): Promise<MarksEntry[]> {
  const db = ensureFirestoreDb();
  const entriesQuery = query(collection(db, "marksEntries"), where("userId", "==", userId), orderBy("date", "desc"));

  return timedFirestoreRead("marksEntries:allExport", async () => {
    const snapshot = await getDocs(entriesQuery);
    return mapMarksEntriesSnapshot(snapshot);
  });
}

export async function addMarksEntry(userId: string, input: MarksEntryInput): Promise<void> {
  const db = ensureFirestoreDb();
  const entryRef = doc(collection(db, "marksEntries"));
  const normalized = normalizeMarksEntryInput(input);

  await setDoc(entryRef, {
    id: entryRef.id,
    userId,
    ...normalized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateMarksEntry(entryId: string, input: MarksEntryInput): Promise<void> {
  const db = ensureFirestoreDb();
  const normalized = normalizeMarksEntryInput(input);

  await updateDoc(doc(db, "marksEntries", entryId), {
    ...normalized,
    updatedAt: serverTimestamp()
  });
}

export async function deleteMarksEntry(entryId: string): Promise<void> {
  const db = ensureFirestoreDb();

  await deleteDoc(doc(db, "marksEntries", entryId));
}

function normalizeBacklogItemInput(
  input: BacklogItemInput
): Omit<BacklogItem, "id" | "userId" | "createdAt" | "updatedAt" | "clearedAt"> {
  const title = input.title.trim();
  const subject = input.subject.trim();
  const status = normalizeBacklogStatus(input.status);

  if (!title) {
    throw new Error("Enter a backlog title.");
  }

  if (!subject) {
    throw new Error("Choose a subject for this backlog item.");
  }

  return {
    title,
    subjectId: input.subjectId?.trim() ?? "",
    subject,
    subjectColor: input.subjectColor?.trim() ?? "",
    subjectIcon: input.subjectIcon?.trim() ?? "",
    chapterId: input.chapterId?.trim() ?? "",
    chapterName: input.chapterName?.trim() ?? "",
    topicId: input.topicId?.trim() ?? "",
    topicName: input.topicName?.trim() ?? "",
    mockTestId: input.mockTestId?.trim() ?? "",
    sourceType: input.sourceType?.trim() ?? "",
    sourceId: input.sourceId?.trim() ?? "",
    backlogLevel: normalizeBacklogLevel(input.backlogLevel),
    reason: normalizeBacklogReason(input.reason),
    targetFinishDate: input.targetFinishDate?.trim() ?? "",
    estimatedMinutes: normalizeOptionalPositiveNumber(input.estimatedMinutes, "Estimated time"),
    status,
    priority: normalizeAssignmentPriority(input.priority),
    notes: input.notes?.trim() ?? ""
  };
}

export function subscribeToBacklogItems(
  userId: string,
  onItems: (items: BacklogItem[]) => void,
  onError: (error: string) => void,
  maxResults: number = READ_LIMITS.backlogItemsPage
): Unsubscribe {
  const db = ensureFirestoreDb();
  const itemsQuery = query(
    collection(db, "backlogItems"),
    where("userId", "==", userId),
    orderBy("updatedAt", "desc"),
    queryLimit(maxResults)
  );

  return onSnapshot(
    itemsQuery,
    (snapshot) => onItems(mapBacklogItemsSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export async function fetchBacklogItems(userId: string): Promise<BacklogItem[]> {
  const db = ensureFirestoreDb();
  const itemsQuery = query(collection(db, "backlogItems"), where("userId", "==", userId));

  return timedFirestoreRead("backlogItems:allExport", async () => {
    const snapshot = await getDocs(itemsQuery);
    return mapBacklogItemsSnapshot(snapshot);
  });
}

export async function addBacklogItem(userId: string, input: BacklogItemInput): Promise<string> {
  const db = ensureFirestoreDb();
  const itemRef = doc(collection(db, "backlogItems"));
  const normalized = normalizeBacklogItemInput(input);

  await setDoc(itemRef, {
    id: itemRef.id,
    userId,
    ...normalized,
    clearedAt: normalized.status === "Cleared" ? serverTimestamp() : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return itemRef.id;
}

export async function updateBacklogItem(itemId: string, input: BacklogItemInput): Promise<void> {
  const db = ensureFirestoreDb();
  const normalized = normalizeBacklogItemInput(input);

  await updateDoc(doc(db, "backlogItems", itemId), {
    ...normalized,
    clearedAt: normalized.status === "Cleared" ? serverTimestamp() : null,
    updatedAt: serverTimestamp()
  });
}

export async function setBacklogItemStatus(itemId: string, status: BacklogStatus): Promise<void> {
  const db = ensureFirestoreDb();
  const normalizedStatus = normalizeBacklogStatus(status);

  await updateDoc(doc(db, "backlogItems", itemId), {
    status: normalizedStatus,
    clearedAt: normalizedStatus === "Cleared" ? serverTimestamp() : null,
    updatedAt: serverTimestamp()
  });
}

export async function deleteBacklogItem(itemId: string): Promise<void> {
  const db = ensureFirestoreDb();

  await deleteDoc(doc(db, "backlogItems", itemId));
}

function getDailyBattlePlanId(userId: string, date: string): string {
  return `${userId}_${date}`.replace(/[^\w-]/g, "_");
}

function normalizeDailyBattlePlanItems(items: DailyBattlePlanItem[]): DailyBattlePlanItem[] {
  return items.map((item, index) => ({
    id: item.id?.trim() || `plan-item-${index + 1}`,
    title: item.title.trim() || "Study item",
    type: normalizeBattlePlanItemType(item.type),
    subjectId: item.subjectId?.trim() ?? "",
    subject: item.subject?.trim() ?? "",
    subjectColor: item.subjectColor?.trim() ?? "",
    subjectIcon: item.subjectIcon?.trim() ?? "",
    recommendedDuration: Math.max(5, Math.round(Number(item.recommendedDuration) || 25)),
    priority: normalizeBattlePlanPriority(item.priority),
    score: Number.isFinite(Number(item.score)) ? Number(item.score) : 0,
    reason: item.reason.trim(),
    suggestedAction: item.suggestedAction.trim(),
    sourceType: normalizeBattlePlanSourceType(item.sourceType),
    sourceId: item.sourceId?.trim() ?? "",
    href: item.href?.trim() || "/dashboard",
    status: normalizeBattlePlanItemStatus(item.status),
    overflow: Boolean(item.overflow)
  }));
}

function normalizeDailyBattlePlanInput(input: DailyBattlePlanInput): Omit<DailyBattlePlan, "id" | "userId" | "createdAt" | "updatedAt" | "generatedAt"> {
  const date = input.date.trim();
  const availableMinutes = Math.max(30, Math.round(Number(input.availableMinutes) || 120));

  if (!date) {
    throw new Error("Choose a battle plan date.");
  }

  return {
    date,
    availableMinutes,
    items: normalizeDailyBattlePlanItems(input.items)
  };
}

export function subscribeToDailyBattlePlan(
  userId: string,
  date: string,
  onPlan: (plan: DailyBattlePlan | null) => void,
  onError: (error: string) => void
): Unsubscribe {
  const db = ensureFirestoreDb();
  const planId = getDailyBattlePlanId(userId, date);

  return onSnapshot(
    doc(db, "dailyBattlePlans", planId),
    (snapshot) => onPlan(snapshot.exists() ? mapDailyBattlePlanDoc(snapshot.id, snapshot.data()) : null),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export async function fetchDailyBattlePlan(userId: string, date: string): Promise<DailyBattlePlan | null> {
  const db = ensureFirestoreDb();
  const snapshot = await getDoc(doc(db, "dailyBattlePlans", getDailyBattlePlanId(userId, date)));

  return snapshot.exists() ? mapDailyBattlePlanDoc(snapshot.id, snapshot.data()) : null;
}

export async function fetchDailyBattlePlans(userId: string): Promise<DailyBattlePlan[]> {
  const db = ensureFirestoreDb();
  const plansQuery = query(collection(db, "dailyBattlePlans"), where("userId", "==", userId), orderBy("date", "desc"));

  return timedFirestoreRead("dailyBattlePlans:allExport", async () => {
    const snapshot = await getDocs(plansQuery);
    return mapDailyBattlePlansSnapshot(snapshot);
  });
}

export async function saveDailyBattlePlan(userId: string, input: DailyBattlePlanInput): Promise<string> {
  const db = ensureFirestoreDb();
  const normalized = normalizeDailyBattlePlanInput(input);
  const planId = getDailyBattlePlanId(userId, normalized.date);
  const planRef = doc(db, "dailyBattlePlans", planId);
  const existing = await getDoc(planRef);

  await setDoc(planRef, {
    id: planId,
    userId,
    ...normalized,
    generatedAt: serverTimestamp(),
    createdAt: existing.exists() ? existing.data().createdAt ?? serverTimestamp() : serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return planId;
}

export async function setDailyBattlePlanItemStatus(
  planId: string,
  itemId: string,
  status: BattlePlanItemStatus
): Promise<void> {
  const db = ensureFirestoreDb();
  const planRef = doc(db, "dailyBattlePlans", planId);
  const snapshot = await getDoc(planRef);

  if (!snapshot.exists()) {
    throw new Error("This battle plan no longer exists.");
  }

  const plan = mapDailyBattlePlanDoc(snapshot.id, snapshot.data());
  const normalizedStatus = normalizeBattlePlanItemStatus(status);
  const items = plan.items.map((item) => item.id === itemId ? { ...item, status: normalizedStatus } : item);

  await updateDoc(planRef, {
    items,
    updatedAt: serverTimestamp()
  });
}

function normalizeRevisionPlanInput(input: RevisionPlanInput): RevisionPlanInput {
  const title = input.title.trim();
  const subjectId = input.subjectId?.trim() ?? "";
  const subject = input.subject.trim();
  const chapterId = input.chapterId?.trim() ?? "";
  const chapterName = input.chapterName?.trim() ?? "";
  const topicId = input.topicId?.trim() ?? "";
  const topicName = input.topicName?.trim() ?? "";
  const backlogItemId = input.backlogItemId?.trim() ?? "";
  const mockTestId = input.mockTestId?.trim() ?? "";
  const sourceType = input.sourceType?.trim() ?? "";
  const sourceId = input.sourceId?.trim() ?? "";
  const notes = input.notes?.trim() ?? "";
  const dueDate = (input.dueDate ?? input.revisionDate ?? input.nextRevisionDate ?? "").trim();
  const revisionType = normalizeRevisionType(input.revisionType);
  const priority = normalizeAssignmentPriority(input.priority);
  const status = normalizeRevisionStatus(input.status);

  if (!title) {
    throw new Error("Enter a revision topic.");
  }

  if (!subject) {
    throw new Error("Enter a subject.");
  }

  if (!dueDate) {
    throw new Error("Choose a revision date.");
  }

  return {
    title,
    subjectId,
    subject,
    chapterId,
    chapterName,
    topicId,
    topicName,
    backlogItemId,
    mockTestId,
    sourceType,
    sourceId,
    revisionType,
    priority,
    status,
    notes,
    dueDate,
    revisionDate: dueDate,
    nextRevisionDate: dueDate
  };
}

export function subscribeToRevisionPlans(
  userId: string,
  onPlans: (plans: RevisionPlan[]) => void,
  onError: (error: string) => void
): Unsubscribe {
  const db = ensureFirestoreDb();
  const revisionsQuery = query(collection(db, "revisionPlans"), where("userId", "==", userId));

  return onSnapshot(
    revisionsQuery,
    (snapshot) => onPlans(mapRevisionPlansSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export async function fetchRevisionPlans(userId: string): Promise<RevisionPlan[]> {
  const db = ensureFirestoreDb();
  const revisionsQuery = query(collection(db, "revisionPlans"), where("userId", "==", userId));

  return timedFirestoreRead("revisions:allExport", async () => {
    const snapshot = await getDocs(revisionsQuery);
    return mapRevisionPlansSnapshot(snapshot);
  });
}

export async function addRevisionPlan(userId: string, input: RevisionPlanInput): Promise<void> {
  const db = ensureFirestoreDb();
  const planRef = doc(collection(db, "revisionPlans"));
  const normalized = normalizeRevisionPlanInput(input);

  await setDoc(planRef, {
    id: planRef.id,
    userId,
    ...normalized,
    lastRevisedDate: normalized.status === "Done" ? getTodayDateKey() : "",
    revisionCount: 0,
    completed: normalized.status !== "Pending",
    completedAt: normalized.status === "Done" ? serverTimestamp() : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateRevisionPlan(planId: string, input: RevisionPlanInput): Promise<void> {
  const db = ensureFirestoreDb();
  const normalized = normalizeRevisionPlanInput(input);

  await updateDoc(doc(db, "revisionPlans", planId), {
    ...normalized,
    completed: normalized.status !== "Pending",
    completedAt: normalized.status === "Done" ? serverTimestamp() : null,
    updatedAt: serverTimestamp()
  });
}

export async function completeRevisionPlan(planId: string, userId: string): Promise<void> {
  const db = ensureFirestoreDb();
  const planRef = doc(db, "revisionPlans", planId);
  const snapshot = await getDoc(planRef);

  if (!snapshot.exists()) {
    throw new Error("This revision topic no longer exists.");
  }

  const data = snapshot.data();

  if (data.userId !== userId) {
    throw new Error("You can only update your own revision plans.");
  }

  const revisionCount = Number(data.revisionCount ?? 0);
  const today = getTodayDateKey();

  await updateDoc(planRef, {
    lastRevisedDate: today,
    revisionCount: revisionCount + 1,
    status: "Done",
    completed: true,
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function finishRevisionPlan(planId: string): Promise<void> {
  const db = ensureFirestoreDb();

  await updateDoc(doc(db, "revisionPlans", planId), {
    status: "Done",
    completed: true,
    completedAt: serverTimestamp(),
    lastRevisedDate: getTodayDateKey(),
    updatedAt: serverTimestamp()
  });
}

export async function skipRevisionPlan(planId: string): Promise<void> {
  const db = ensureFirestoreDb();

  await updateDoc(doc(db, "revisionPlans", planId), {
    status: "Skipped",
    completed: true,
    completedAt: null,
    updatedAt: serverTimestamp()
  });
}

export async function reopenRevisionPlan(planId: string): Promise<void> {
  const db = ensureFirestoreDb();

  await updateDoc(doc(db, "revisionPlans", planId), {
    status: "Pending",
    completed: false,
    completedAt: null,
    updatedAt: serverTimestamp()
  });
}

export async function deleteRevisionPlan(planId: string): Promise<void> {
  const db = ensureFirestoreDb();

  await deleteDoc(doc(db, "revisionPlans", planId));
}

function normalizeName(value: string, message: string): string {
  const name = value.trim();

  if (!name) {
    throw new Error(message);
  }

  return name;
}

const SUBJECT_COLORS = ["#C9A46C", "#7C6F57", "#6E8B7E", "#8A6F9E", "#B66A5D", "#4F7CAC"];

function normalizeSubjectIcon(name: string, icon?: string): string {
  const trimmedIcon = icon?.trim().slice(0, 3).toUpperCase();

  if (trimmedIcon) {
    return trimmedIcon;
  }

  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "SB";
}

function normalizeSubjectColor(value?: string, fallbackIndex = 0): string {
  const color = value?.trim() ?? "";

  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    return color;
  }

  return SUBJECT_COLORS[fallbackIndex % SUBJECT_COLORS.length];
}

function normalizeSyllabusSubjectInput(
  input: string | SyllabusSubjectInput,
  fallbackIndex = 0
): Omit<SyllabusSubject, "id" | "userId" | "createdAt" | "updatedAt"> {
  const source = typeof input === "string" ? { name: input } : input;
  const name = normalizeName(source.name, "Enter a subject name.");
  const targetType = source.targetType === "score" || source.targetType === "percentage" ? source.targetType : undefined;
  const targetValue = source.targetValue === "" || source.targetValue === null || source.targetValue === undefined
    ? null
    : Number(source.targetValue);

  if (targetValue !== null && (!Number.isFinite(targetValue) || targetValue <= 0)) {
    throw new Error("Target score must be greater than 0.");
  }

  if (targetType === "percentage" && targetValue !== null && targetValue > 100) {
    throw new Error("Target percentage cannot be above 100.");
  }

  return {
    name,
    color: normalizeSubjectColor(source.color, fallbackIndex),
    icon: normalizeSubjectIcon(name, source.icon),
    targetType,
    targetValue,
    description: source.description?.trim() ?? ""
  };
}

export function subscribeToSyllabusSubjects(
  userId: string,
  onSubjects: (subjects: SyllabusSubject[]) => void,
  onError: (error: string) => void
): Unsubscribe {
  const db = ensureFirestoreDb();
  const subjectsQuery = query(collection(db, "syllabusSubjects"), where("userId", "==", userId));

  return onSnapshot(
    subjectsQuery,
    (snapshot) => onSubjects(mapSyllabusSubjectsSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export function subscribeToSyllabusChapters(
  userId: string,
  onChapters: (chapters: SyllabusChapter[]) => void,
  onError: (error: string) => void
): Unsubscribe {
  const db = ensureFirestoreDb();
  const chaptersQuery = query(collection(db, "syllabusChapters"), where("userId", "==", userId));

  return onSnapshot(
    chaptersQuery,
    (snapshot) => onChapters(mapSyllabusChaptersSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export function subscribeToSyllabusTopics(
  userId: string,
  onTopics: (topics: SyllabusTopic[]) => void,
  onError: (error: string) => void
): Unsubscribe {
  const db = ensureFirestoreDb();
  const topicsQuery = query(collection(db, "syllabusTopics"), where("userId", "==", userId));

  return onSnapshot(
    topicsQuery,
    (snapshot) => onTopics(mapSyllabusTopicsSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export async function fetchSyllabusSubjects(userId: string): Promise<SyllabusSubject[]> {
  const db = ensureFirestoreDb();
  const subjectsQuery = query(collection(db, "syllabusSubjects"), where("userId", "==", userId));

  return timedFirestoreRead("syllabusSubjects:allExport", async () => {
    const snapshot = await getDocs(subjectsQuery);
    return mapSyllabusSubjectsSnapshot(snapshot);
  });
}

export async function fetchSyllabusChapters(userId: string): Promise<SyllabusChapter[]> {
  const db = ensureFirestoreDb();
  const chaptersQuery = query(collection(db, "syllabusChapters"), where("userId", "==", userId));

  return timedFirestoreRead("syllabusChapters:allExport", async () => {
    const snapshot = await getDocs(chaptersQuery);
    return mapSyllabusChaptersSnapshot(snapshot);
  });
}

export async function fetchSyllabusTopics(userId: string): Promise<SyllabusTopic[]> {
  const db = ensureFirestoreDb();
  const topicsQuery = query(collection(db, "syllabusTopics"), where("userId", "==", userId));

  return timedFirestoreRead("syllabusTopics:allExport", async () => {
    const snapshot = await getDocs(topicsQuery);
    return mapSyllabusTopicsSnapshot(snapshot);
  });
}

export async function addSyllabusSubject(userId: string, input: string | SyllabusSubjectInput): Promise<void> {
  const db = ensureFirestoreDb();
  const subjectRef = doc(collection(db, "syllabusSubjects"));
  const normalized = normalizeSyllabusSubjectInput(input);

  await setDoc(subjectRef, {
    id: subjectRef.id,
    userId,
    ...normalized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateSyllabusSubject(subjectId: string, input: string | SyllabusSubjectInput): Promise<void> {
  const db = ensureFirestoreDb();
  const normalized = typeof input === "string"
    ? { name: normalizeName(input, "Enter a subject name.") }
    : normalizeSyllabusSubjectInput(input);

  await updateDoc(doc(db, "syllabusSubjects", subjectId), {
    ...normalized,
    updatedAt: serverTimestamp()
  });
}

export async function deleteSyllabusSubject(userId: string, subjectId: string): Promise<void> {
  const db = ensureFirestoreDb();
  const batch = writeBatch(db);
  const [chaptersSnapshot, topicsSnapshot] = await Promise.all([
    getDocs(query(collection(db, "syllabusChapters"), where("userId", "==", userId))),
    getDocs(query(collection(db, "syllabusTopics"), where("userId", "==", userId)))
  ]);

  chaptersSnapshot.docs
    .filter((chapterDoc) => chapterDoc.data().subjectId === subjectId)
    .forEach((chapterDoc) => batch.delete(chapterDoc.ref));
  topicsSnapshot.docs
    .filter((topicDoc) => topicDoc.data().subjectId === subjectId)
    .forEach((topicDoc) => batch.delete(topicDoc.ref));
  batch.delete(doc(db, "syllabusSubjects", subjectId));

  await batch.commit();
}

export async function addSyllabusChapter(userId: string, subjectId: string, name: string): Promise<void> {
  const db = ensureFirestoreDb();
  const chapterRef = doc(collection(db, "syllabusChapters"));

  if (!subjectId) {
    throw new Error("Choose a subject first.");
  }

  await setDoc(chapterRef, {
    id: chapterRef.id,
    userId,
    subjectId,
    name: normalizeName(name, "Enter a chapter name."),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateSyllabusChapter(chapterId: string, name: string): Promise<void> {
  const db = ensureFirestoreDb();

  await updateDoc(doc(db, "syllabusChapters", chapterId), {
    name: normalizeName(name, "Enter a chapter name."),
    updatedAt: serverTimestamp()
  });
}

export async function setSyllabusChapterStatus(
  chapterId: string,
  status: TopicStudyStatus,
  statusNotes = ""
): Promise<void> {
  const db = ensureFirestoreDb();

  await updateDoc(doc(db, "syllabusChapters", chapterId), {
    status: normalizeTopicStudyStatus(status),
    statusNotes: statusNotes.trim(),
    statusUpdatedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function deleteSyllabusChapter(userId: string, chapterId: string): Promise<void> {
  const db = ensureFirestoreDb();
  const batch = writeBatch(db);
  const topicsSnapshot = await getDocs(query(collection(db, "syllabusTopics"), where("userId", "==", userId)));

  topicsSnapshot.docs
    .filter((topicDoc) => topicDoc.data().chapterId === chapterId)
    .forEach((topicDoc) => batch.delete(topicDoc.ref));
  batch.delete(doc(db, "syllabusChapters", chapterId));

  await batch.commit();
}

export async function addSyllabusTopic(
  userId: string,
  subjectId: string,
  chapterId: string,
  name: string
): Promise<void> {
  const db = ensureFirestoreDb();
  const topicRef = doc(collection(db, "syllabusTopics"));

  if (!subjectId || !chapterId) {
    throw new Error("Choose a subject and chapter first.");
  }

  await setDoc(topicRef, {
    id: topicRef.id,
    userId,
    subjectId,
    chapterId,
    name: normalizeName(name, "Enter a topic name."),
    completed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateSyllabusTopic(topicId: string, name: string): Promise<void> {
  const db = ensureFirestoreDb();

  await updateDoc(doc(db, "syllabusTopics", topicId), {
    name: normalizeName(name, "Enter a topic name."),
    updatedAt: serverTimestamp()
  });
}

export async function setSyllabusTopicCompleted(topicId: string, completed: boolean): Promise<void> {
  const db = ensureFirestoreDb();

  await updateDoc(doc(db, "syllabusTopics", topicId), {
    completed,
    status: completed ? "Completed" : "Not Started",
    statusUpdatedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function setSyllabusTopicStatus(
  topicId: string,
  status: TopicStudyStatus,
  statusNotes = ""
): Promise<void> {
  const db = ensureFirestoreDb();
  const normalizedStatus = normalizeTopicStudyStatus(status);

  await updateDoc(doc(db, "syllabusTopics", topicId), {
    status: normalizedStatus,
    statusNotes: statusNotes.trim(),
    completed: normalizedStatus === "Completed",
    statusUpdatedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function deleteSyllabusTopic(topicId: string): Promise<void> {
  const db = ensureFirestoreDb();

  await deleteDoc(doc(db, "syllabusTopics", topicId));
}

function normalizeHabitInput(input: StudyHabitInput): StudyHabitInput {
  const title = input.title.trim();
  const description = input.description?.trim() ?? "";

  if (!title) {
    throw new Error("Enter a habit title.");
  }

  return { title, description };
}

export function subscribeToHabits(
  userId: string,
  onHabits: (habits: StudyHabit[]) => void,
  onError: (error: string) => void
): Unsubscribe {
  const db = ensureFirestoreDb();
  const habitsQuery = query(collection(db, "habits"), where("userId", "==", userId));

  return onSnapshot(
    habitsQuery,
    (snapshot) => onHabits(mapHabitsSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export async function fetchHabits(userId: string): Promise<StudyHabit[]> {
  const db = ensureFirestoreDb();
  const habitsQuery = query(collection(db, "habits"), where("userId", "==", userId));

  return timedFirestoreRead("habits:allExport", async () => {
    const snapshot = await getDocs(habitsQuery);
    return mapHabitsSnapshot(snapshot);
  });
}

export function subscribeToHabitCompletions(
  userId: string,
  onCompletions: (completions: HabitCompletion[]) => void,
  onError: (error: string) => void
): Unsubscribe {
  const db = ensureFirestoreDb();
  const completionsQuery = query(collection(db, "habitCompletions"), where("userId", "==", userId));

  return onSnapshot(
    completionsQuery,
    (snapshot) => onCompletions(mapHabitCompletionsSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export async function fetchHabitCompletions(userId: string): Promise<HabitCompletion[]> {
  const db = ensureFirestoreDb();
  const completionsQuery = query(collection(db, "habitCompletions"), where("userId", "==", userId));

  return timedFirestoreRead("habitCompletions:allExport", async () => {
    const snapshot = await getDocs(completionsQuery);
    return mapHabitCompletionsSnapshot(snapshot);
  });
}

export async function addStudyHabit(userId: string, input: StudyHabitInput): Promise<void> {
  const db = ensureFirestoreDb();
  const habitRef = doc(collection(db, "habits"));
  const normalized = normalizeHabitInput(input);

  await setDoc(habitRef, {
    id: habitRef.id,
    userId,
    ...normalized,
    frequency: "daily",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateStudyHabit(habitId: string, input: StudyHabitInput): Promise<void> {
  const db = ensureFirestoreDb();
  const normalized = normalizeHabitInput(input);

  await updateDoc(doc(db, "habits", habitId), {
    ...normalized,
    updatedAt: serverTimestamp()
  });
}

function getHabitCompletionId(userId: string, habitId: string, date: string): string {
  return `${userId}_${habitId}_${date}`.replace(/\//g, "_");
}

export async function setHabitCompletion(
  userId: string,
  habitId: string,
  completed: boolean,
  date = getTodayDateKey()
): Promise<void> {
  const db = ensureFirestoreDb();
  const completionRef = doc(db, "habitCompletions", getHabitCompletionId(userId, habitId, date));

  if (completed) {
    await setDoc(completionRef, {
      id: completionRef.id,
      userId,
      habitId,
      date,
      completedAt: serverTimestamp()
    });
    return;
  }

  await deleteDoc(completionRef);
}

export async function deleteStudyHabit(userId: string, habitId: string): Promise<void> {
  const db = ensureFirestoreDb();
  const batch = writeBatch(db);
  const completionsSnapshot = await getDocs(query(collection(db, "habitCompletions"), where("userId", "==", userId)));

  completionsSnapshot.docs
    .filter((completionDoc) => completionDoc.data().habitId === habitId)
    .forEach((completionDoc) => batch.delete(completionDoc.ref));
  batch.delete(doc(db, "habits", habitId));

  await batch.commit();
}

function roundMetric(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalizeMockNonNegativeNumber(value: number | string | null | undefined, label: string, whole = false): number {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new Error(`${label} cannot be negative.`);
  }

  return whole ? Math.round(numberValue) : numberValue;
}

function normalizeMockOptionalNonNegativeNumber(value: number | string | null | undefined, label: string, whole = false): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return normalizeMockNonNegativeNumber(value, label, whole);
}

function normalizeMockSubjectBreakdownInput(input: MockSubjectBreakdownInput, index: number): MockSubjectBreakdown {
  const subject = input.subject.trim();
  const score = normalizeMockNonNegativeNumber(input.score, `Subject ${index + 1} score`);
  const totalMarks = normalizeMockNonNegativeNumber(input.totalMarks, `Subject ${index + 1} total marks`);
  const correct = normalizeMockOptionalNonNegativeNumber(input.correct, `Subject ${index + 1} correct`, true) ?? 0;
  const incorrect = normalizeMockOptionalNonNegativeNumber(input.incorrect, `Subject ${index + 1} incorrect`, true) ?? 0;
  const attempted = normalizeMockOptionalNonNegativeNumber(input.attempted, `Subject ${index + 1} attempted`, true) ?? correct + incorrect;
  const skipped = normalizeMockOptionalNonNegativeNumber(input.skipped, `Subject ${index + 1} skipped`, true) ?? 0;
  const timeSpentMinutes = normalizeMockOptionalNonNegativeNumber(input.timeSpentMinutes, `Subject ${index + 1} time`, true);

  if (!subject) {
    throw new Error(`Enter subject name for subject row ${index + 1}.`);
  }

  if (totalMarks <= 0) {
    throw new Error(`Subject ${index + 1} total marks must be greater than 0.`);
  }

  if (score > totalMarks) {
    throw new Error(`Subject ${index + 1} score cannot exceed total marks.`);
  }

  if (correct + incorrect > attempted) {
    throw new Error(`Subject ${index + 1} correct plus incorrect cannot exceed attempted.`);
  }

  return {
    id: input.id?.trim() || `subject-${Date.now()}-${index}`,
    subjectId: input.subjectId?.trim() ?? "",
    subject,
    subjectColor: input.subjectColor?.trim() ?? "",
    subjectIcon: input.subjectIcon?.trim() ?? "",
    score,
    totalMarks,
    percentage: roundMetric((score / totalMarks) * 100),
    attempted,
    correct,
    incorrect,
    skipped,
    accuracy: attempted > 0 ? roundMetric((correct / attempted) * 100) : 0,
    timeSpentMinutes,
    notes: input.notes?.trim() ?? ""
  };
}

function normalizeMockTopicAnalysisInput(input: MockTopicAnalysisInput, index: number): MockTopicAnalysis {
  const subject = input.subject.trim();
  const performanceLevel = normalizeMockPerformanceLevel(input.performanceLevel);

  if (!subject) {
    throw new Error(`Enter subject name for weakness row ${index + 1}.`);
  }

  return {
    id: input.id?.trim() || `topic-${Date.now()}-${index}`,
    subjectId: input.subjectId?.trim() ?? "",
    subject,
    subjectColor: input.subjectColor?.trim() ?? "",
    subjectIcon: input.subjectIcon?.trim() ?? "",
    chapterId: input.chapterId?.trim() ?? "",
    chapterName: input.chapterName?.trim() ?? "",
    topicId: input.topicId?.trim() ?? "",
    topicName: input.topicName?.trim() ?? "",
    performanceLevel,
    attempted: normalizeMockOptionalNonNegativeNumber(input.attempted, `Weakness ${index + 1} attempted`, true),
    correct: normalizeMockOptionalNonNegativeNumber(input.correct, `Weakness ${index + 1} correct`, true),
    incorrect: normalizeMockOptionalNonNegativeNumber(input.incorrect, `Weakness ${index + 1} incorrect`, true),
    skipped: normalizeMockOptionalNonNegativeNumber(input.skipped, `Weakness ${index + 1} skipped`, true),
    mistakeTags: normalizeMockMistakeTags(input.mistakeTags),
    notes: input.notes?.trim() ?? ""
  };
}

function normalizeMockTimeAnalysisInput(input?: MockTimeAnalysisInput): MockTimeAnalysis | undefined {
  if (!input) {
    return undefined;
  }

  const totalTimeSpentMinutes = normalizeMockOptionalNonNegativeNumber(input.totalTimeSpentMinutes, "Total time spent", true);
  const slowSubject = input.slowSubject?.trim() ?? "";
  const rushedSubject = input.rushedSubject?.trim() ?? "";
  const notes = input.notes?.trim() ?? "";
  const timePressure = Boolean(input.timePressure);

  if (totalTimeSpentMinutes === null && !timePressure && !slowSubject && !rushedSubject && !notes) {
    return undefined;
  }

  return {
    totalTimeSpentMinutes,
    timePressure,
    slowSubject,
    rushedSubject,
    notes
  };
}

function normalizeMockTestInput(input: MockTestInput): Omit<MockTestResult, "id" | "userId" | "createdAt" | "updatedAt"> {
  const title = input.title.trim();
  const examType = normalizeMockExamType(input.examType);
  const subjectId = input.subjectId?.trim() ?? "";
  const subject = input.subject?.trim() ?? "";
  const subjectColor = input.subjectColor?.trim() ?? "";
  const subjectIcon = input.subjectIcon?.trim() ?? "";
  const score = Number(input.score);
  const totalMarks = Number(input.totalMarks);
  const percentile = normalizeMockOptionalNonNegativeNumber(input.percentile, "Percentile");
  const rank = normalizeMockOptionalNonNegativeNumber(input.rank, "Rank", true);
  const totalQuestions = Number(input.totalQuestions);
  const correctAnswers = Number(input.correctAnswers);
  const wrongAnswers = Number(input.wrongAnswers);
  const timeTakenMinutes = Number(input.timeTakenMinutes);
  const testDate = input.testDate.trim();
  const notes = input.notes?.trim() ?? "";
  const attemptedQuestions = correctAnswers + wrongAnswers;
  const skippedQuestions = totalQuestions - attemptedQuestions;

  if (!title) {
    throw new Error("Enter a mock test title.");
  }

  if (!testDate) {
    throw new Error("Choose a test date.");
  }

  if (!Number.isFinite(totalMarks) || totalMarks <= 0) {
    throw new Error("Total marks must be greater than 0.");
  }

  if (!Number.isFinite(score) || score < 0 || score > totalMarks) {
    throw new Error("Score must be between 0 and total marks.");
  }

  if (!Number.isInteger(totalQuestions) || totalQuestions <= 0) {
    throw new Error("Total questions must be greater than 0.");
  }

  if (!Number.isInteger(correctAnswers) || !Number.isInteger(wrongAnswers) || correctAnswers < 0 || wrongAnswers < 0) {
    throw new Error("Answers must be valid whole numbers.");
  }

  if (attemptedQuestions > totalQuestions) {
    throw new Error("Correct plus wrong answers cannot exceed total questions.");
  }

  if (!Number.isFinite(timeTakenMinutes) || timeTakenMinutes < 0) {
    throw new Error("Time taken cannot be negative.");
  }

  if (percentile !== null && percentile > 100) {
    throw new Error("Percentile cannot exceed 100.");
  }

  return {
    title,
    examType,
    subjectId,
    subject,
    subjectColor,
    subjectIcon,
    score,
    totalMarks,
    percentage: roundMetric((score / totalMarks) * 100),
    percentile,
    rank,
    totalQuestions,
    attemptedQuestions,
    correctAnswers,
    wrongAnswers,
    skippedQuestions,
    accuracy: attemptedQuestions > 0 ? roundMetric((correctAnswers / attemptedQuestions) * 100) : 0,
    timeTakenMinutes,
    testDate,
    subjectBreakdowns: (input.subjectBreakdowns ?? []).map((item, index) => normalizeMockSubjectBreakdownInput(item, index)),
    topicAnalyses: (input.topicAnalyses ?? []).map((item, index) => normalizeMockTopicAnalysisInput(item, index)),
    mistakeTags: normalizeMockMistakeTags(input.mistakeTags),
    timeAnalysis: normalizeMockTimeAnalysisInput(input.timeAnalysis) ?? null,
    notes
  };
}

export function subscribeToMockTests(
  userId: string,
  onTests: (tests: MockTestResult[]) => void,
  onError: (error: string) => void,
  maxResults: number = READ_LIMITS.mockTestsPage
): Unsubscribe {
  const db = ensureFirestoreDb();
  const testsQuery = query(
    collection(db, "mockTests"),
    where("userId", "==", userId),
    orderBy("testDate", "desc"),
    queryLimit(maxResults)
  );

  return onSnapshot(
    testsQuery,
    (snapshot) => onTests(mapMockTestsSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export async function fetchMockTests(userId: string): Promise<MockTestResult[]> {
  const db = ensureFirestoreDb();
  const testsQuery = query(collection(db, "mockTests"), where("userId", "==", userId));

  return timedFirestoreRead("mockTests:allExport", async () => {
    const snapshot = await getDocs(testsQuery);
    return mapMockTestsSnapshot(snapshot);
  });
}

export async function fetchMockTestById(userId: string, testId: string): Promise<MockTestResult | null> {
  const db = ensureFirestoreDb();
  const snapshot = await getDoc(doc(db, "mockTests", testId));

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  if (data.userId !== userId) {
    return null;
  }

  return mapMockTestDoc(snapshot.id, data);
}

export async function addMockTest(userId: string, input: MockTestInput): Promise<void> {
  const db = ensureFirestoreDb();
  const testRef = doc(collection(db, "mockTests"));
  const normalized = normalizeMockTestInput(input);

  await setDoc(testRef, {
    id: testRef.id,
    userId,
    ...normalized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateMockTest(testId: string, input: MockTestInput): Promise<void> {
  const db = ensureFirestoreDb();
  const normalized = normalizeMockTestInput(input);

  await updateDoc(doc(db, "mockTests", testId), {
    ...normalized,
    updatedAt: serverTimestamp()
  });
}

export async function deleteMockTest(testId: string): Promise<void> {
  const db = ensureFirestoreDb();

  await deleteDoc(doc(db, "mockTests", testId));
}

const GOAL_TYPES: StudyGoalType[] = [
  "studyHours",
  "taskCompletion",
  "subjectCompletion",
  "chapterCompletion",
  "mockTestScore",
  "habitConsistency"
];

function normalizeStudyGoalInput(input: StudyGoalInput): Omit<StudyGoal, "id" | "userId" | "createdAt" | "updatedAt"> {
  const title = input.title.trim();
  const goalType = input.goalType;
  const targetValue = Number(input.targetValue);
  const currentValue = Number(input.currentValue);
  const startDate = input.startDate.trim();
  const targetDate = input.targetDate.trim();

  if (!title) {
    throw new Error("Enter a goal title.");
  }

  if (!GOAL_TYPES.includes(goalType)) {
    throw new Error("Choose a valid goal type.");
  }

  if (!Number.isFinite(targetValue) || targetValue <= 0) {
    throw new Error("Target value must be greater than 0.");
  }

  if (!Number.isFinite(currentValue) || currentValue < 0) {
    throw new Error("Current progress cannot be negative.");
  }

  if (!startDate || !targetDate) {
    throw new Error("Choose start and target dates.");
  }

  return {
    title,
    goalType,
    targetValue,
    currentValue,
    startDate,
    targetDate,
    linkedSubjectId: input.linkedSubjectId?.trim() ?? "",
    linkedSubjectName: input.linkedSubjectName?.trim() ?? "",
    linkedChapterId: input.linkedChapterId?.trim() ?? "",
    linkedChapterName: input.linkedChapterName?.trim() ?? "",
    status: input.status === "completed" ? "completed" : "active"
  };
}

export function subscribeToStudyGoals(
  userId: string,
  onGoals: (goals: StudyGoal[]) => void,
  onError: (error: string) => void,
  maxResults: number = READ_LIMITS.goalsPage
): Unsubscribe {
  const db = ensureFirestoreDb();
  const goalsQuery = query(
    collection(db, "studyGoals"),
    where("userId", "==", userId),
    orderBy("targetDate", "asc"),
    queryLimit(maxResults)
  );

  return onSnapshot(
    goalsQuery,
    (snapshot) => onGoals(mapStudyGoalsSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export async function fetchStudyGoals(userId: string): Promise<StudyGoal[]> {
  const db = ensureFirestoreDb();
  const goalsQuery = query(collection(db, "studyGoals"), where("userId", "==", userId));

  return timedFirestoreRead("goals:allExport", async () => {
    const snapshot = await getDocs(goalsQuery);
    return mapStudyGoalsSnapshot(snapshot);
  });
}

export async function addStudyGoal(userId: string, input: StudyGoalInput): Promise<void> {
  const db = ensureFirestoreDb();
  const goalRef = doc(collection(db, "studyGoals"));
  const normalized = normalizeStudyGoalInput(input);

  await setDoc(goalRef, {
    id: goalRef.id,
    userId,
    ...normalized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateStudyGoal(goalId: string, input: StudyGoalInput): Promise<void> {
  const db = ensureFirestoreDb();
  const normalized = normalizeStudyGoalInput(input);

  await updateDoc(doc(db, "studyGoals", goalId), {
    ...normalized,
    updatedAt: serverTimestamp()
  });
}

export async function deleteStudyGoal(goalId: string): Promise<void> {
  const db = ensureFirestoreDb();

  await deleteDoc(doc(db, "studyGoals", goalId));
}

function normalizeRating(value: number, label: string): number {
  const rating = Number(value);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error(`${label} must be between 1 and 5.`);
  }

  return rating;
}

function normalizeStudyJournalInput(
  input: StudyJournalInput
): Omit<StudyJournalEntry, "id" | "userId" | "createdAt" | "updatedAt"> {
  const title = input.title.trim();
  const studiedText = input.studiedText.trim();
  const struggleText = input.struggleText.trim();
  const nextAction = input.nextAction.trim();
  const date = input.date.trim();

  if (!title) {
    throw new Error("Enter a journal title.");
  }

  if (!date) {
    throw new Error("Choose a journal date.");
  }

  return {
    sessionId: input.sessionId?.trim() ?? "",
    taskId: input.taskId?.trim() ?? "",
    subject: input.subject?.trim() ?? "",
    title,
    studiedText,
    struggleText,
    nextAction,
    moodRating: normalizeRating(input.moodRating, "Mood rating"),
    focusRating: normalizeRating(input.focusRating, "Focus rating"),
    difficultyRating: normalizeRating(input.difficultyRating, "Difficulty rating"),
    date
  };
}

export function subscribeToStudyJournals(
  userId: string,
  onEntries: (entries: StudyJournalEntry[]) => void,
  onError: (error: string) => void,
  maxResults: number = READ_LIMITS.journalsPage
): Unsubscribe {
  const db = ensureFirestoreDb();
  const journalsQuery = query(
    collection(db, "studyJournals"),
    where("userId", "==", userId),
    orderBy("date", "desc"),
    queryLimit(maxResults)
  );

  return onSnapshot(
    journalsQuery,
    (snapshot) => onEntries(mapStudyJournalsSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export async function fetchStudyJournals(userId: string): Promise<StudyJournalEntry[]> {
  const db = ensureFirestoreDb();
  const journalsQuery = query(collection(db, "studyJournals"), where("userId", "==", userId));

  return timedFirestoreRead("journals:allExport", async () => {
    const snapshot = await getDocs(journalsQuery);
    return mapStudyJournalsSnapshot(snapshot);
  });
}

export async function addStudyJournal(userId: string, input: StudyJournalInput): Promise<void> {
  const db = ensureFirestoreDb();
  const journalRef = doc(collection(db, "studyJournals"));
  const normalized = normalizeStudyJournalInput(input);

  await setDoc(journalRef, {
    id: journalRef.id,
    userId,
    ...normalized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateStudyJournal(entryId: string, input: StudyJournalInput): Promise<void> {
  const db = ensureFirestoreDb();
  const normalized = normalizeStudyJournalInput(input);

  await updateDoc(doc(db, "studyJournals", entryId), {
    ...normalized,
    updatedAt: serverTimestamp()
  });
}

export async function deleteStudyJournal(entryId: string): Promise<void> {
  const db = ensureFirestoreDb();

  await deleteDoc(doc(db, "studyJournals", entryId));
}

function uniqueTextList(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))
  );
}

function normalizePositiveNumber(value: number, fallback: number, label: string): number {
  const nextValue = Number(value);

  if (!Number.isFinite(nextValue) || nextValue <= 0) {
    if (fallback > 0) {
      return fallback;
    }

    throw new Error(`${label} must be greater than 0.`);
  }

  return Math.round(nextValue);
}

type UserProfileClientData = Pick<
  UserProfile,
  | "displayName"
  | "profileImageDataUrl"
  | "studyGoal"
  | "dailyStudyTargetMinutes"
  | "preferredFocusDuration"
  | "subjects"
  | "onboardingCompleted"
  | "notificationEnabled"
  | "reminderTime"
  | "revisionReminderEnabled"
  | "habitReminderEnabled"
  | "taskReminderEnabled"
  | "emailNotificationsEnabled"
  | "welcomeEmailsEnabled"
  | "paymentEmailsEnabled"
  | "planExpiryEmailsEnabled"
  | "weeklySummaryEmailsEnabled"
  | "weekStartDay"
>;

function getDefaultBillingFields(): Pick<
  UserProfile,
  | "plan"
  | "subscriptionStatus"
  | "billingCycle"
  | "planStartedAt"
  | "planExpiresAt"
  | "trialEndsAt"
  | "cancelAtPeriodEnd"
  | "razorpayCustomerId"
  | "razorpayOrderId"
  | "razorpayPaymentId"
  | "razorpaySubscriptionId"
  | "lastPaymentVerifiedAt"
> {
  return {
    plan: "free",
    subscriptionStatus: "free",
    billingCycle: "none",
    planStartedAt: null,
    planExpiresAt: null,
    trialEndsAt: null,
    cancelAtPeriodEnd: false,
    razorpayCustomerId: "",
    razorpayOrderId: "",
    razorpayPaymentId: "",
    razorpaySubscriptionId: "",
    lastPaymentVerifiedAt: null
  };
}

function normalizeUserProfileInput(input: UserProfileInput): UserProfileClientData {
  const weekStartDay = Number(input.weekStartDay);

  return {
    displayName: input.displayName?.trim() ?? "",
    profileImageDataUrl: input.profileImageDataUrl?.trim() ?? "",
    studyGoal: input.studyGoal.trim() || "General productivity",
    dailyStudyTargetMinutes: normalizePositiveNumber(input.dailyStudyTargetMinutes, 120, "Daily target"),
    preferredFocusDuration: normalizePositiveNumber(input.preferredFocusDuration, 25, "Focus duration"),
    subjects: uniqueTextList(input.subjects),
    onboardingCompleted: Boolean(input.onboardingCompleted),
    notificationEnabled: Boolean(input.notificationEnabled),
    reminderTime: input.reminderTime?.trim() || "18:00",
    revisionReminderEnabled: Boolean(input.revisionReminderEnabled),
    habitReminderEnabled: Boolean(input.habitReminderEnabled),
    taskReminderEnabled: Boolean(input.taskReminderEnabled),
    emailNotificationsEnabled: Boolean(input.emailNotificationsEnabled),
    welcomeEmailsEnabled: Boolean(input.welcomeEmailsEnabled),
    paymentEmailsEnabled: Boolean(input.paymentEmailsEnabled),
    planExpiryEmailsEnabled: Boolean(input.planExpiryEmailsEnabled),
    weeklySummaryEmailsEnabled: Boolean(input.weeklySummaryEmailsEnabled),
    weekStartDay: Number.isInteger(weekStartDay) && weekStartDay >= 0 && weekStartDay <= 6 ? weekStartDay : 0
  };
}

export function subscribeToUserProfile(
  userId: string,
  onProfile: (profile: UserProfile | null) => void,
  onError: (error: string) => void
): Unsubscribe {
  const db = ensureFirestoreDb();

  return onSnapshot(
    doc(db, "userProfiles", userId),
    (snapshot) => onProfile(snapshot.exists() ? mapUserProfile(snapshot.data()) : null),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const db = ensureFirestoreDb();
  const snapshot = await getDoc(doc(db, "userProfiles", userId));

  return snapshot.exists() ? mapUserProfile(snapshot.data()) : null;
}

export function subscribeToPayments(
  userId: string,
  onPayments: (payments: PaymentRecord[]) => void,
  onError: (error: string) => void,
  maxResults: number = READ_LIMITS.paymentsPage
): Unsubscribe {
  const db = ensureFirestoreDb();
  const paymentsQuery = query(
    collection(db, "payments"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    queryLimit(maxResults)
  );

  return onSnapshot(
    paymentsQuery,
    (snapshot) => onPayments(mapPaymentsSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export async function fetchPayments(userId: string, maxResults: number = READ_LIMITS.paymentsPage): Promise<PaymentRecord[]> {
  const db = ensureFirestoreDb();
  const paymentsQuery = query(
    collection(db, "payments"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    queryLimit(maxResults)
  );

  return timedFirestoreRead("payments:recent", async () => {
    const snapshot = await getDocs(paymentsQuery);
    return mapPaymentsSnapshot(snapshot);
  });
}

export async function upsertUserProfile(userId: string, input: UserProfileInput): Promise<UserProfile> {
  const db = ensureFirestoreDb();
  const profileRef = doc(db, "userProfiles", userId);
  const snapshot = await getDoc(profileRef);
  const normalized = normalizeUserProfileInput(input);

  await setDoc(
    profileRef,
    {
      ...(snapshot.exists() ? {} : { createdAt: serverTimestamp(), ...getDefaultBillingFields() }),
      userId,
      ...normalized,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  return {
    userId,
    ...(snapshot.exists() ? mapUserProfile(snapshot.data()) : getDefaultBillingFields()),
    ...normalized,
    createdAt: snapshot.exists() ? snapshot.data().createdAt ?? null : null,
    updatedAt: null
  };
}

function normalizeStudyTemplateInput(
  input: StudyTemplateInput
): Omit<StudyTemplate, "id" | "userId" | "isSystemTemplate" | "createdAt" | "updatedAt"> {
  const title = input.title.trim();
  const description = input.description.trim();

  if (!title) {
    throw new Error("Enter a template title.");
  }

  return {
    title,
    description,
    type: input.type,
    config: input.config ?? {}
  };
}

export function subscribeToStudyTemplates(
  userId: string,
  onTemplates: (templates: StudyTemplate[]) => void,
  onError: (error: string) => void
): Unsubscribe {
  const db = ensureFirestoreDb();
  const templatesQuery = query(collection(db, "studyTemplates"), where("userId", "==", userId));

  return onSnapshot(
    templatesQuery,
    (snapshot) => onTemplates(mapStudyTemplatesSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export async function addStudyTemplate(userId: string, input: StudyTemplateInput): Promise<void> {
  const db = ensureFirestoreDb();
  const templateRef = doc(collection(db, "studyTemplates"));
  const normalized = normalizeStudyTemplateInput(input);

  await setDoc(templateRef, {
    id: templateRef.id,
    userId,
    ...normalized,
    isSystemTemplate: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateStudyTemplate(templateId: string, input: StudyTemplateInput): Promise<void> {
  const db = ensureFirestoreDb();
  const normalized = normalizeStudyTemplateInput(input);

  await updateDoc(doc(db, "studyTemplates", templateId), {
    ...normalized,
    updatedAt: serverTimestamp()
  });
}

export async function deleteStudyTemplate(templateId: string): Promise<void> {
  const db = ensureFirestoreDb();

  await deleteDoc(doc(db, "studyTemplates", templateId));
}

function deterministicUserDateId(userId: string, key: string): string {
  return `${userId}_${key}`.replace(/[^\w-]/g, "_");
}

function normalizeDailyReviewInput(
  input: DailyReviewInput
): Omit<DailyReview, "id" | "userId" | "createdAt" | "updatedAt"> {
  const date = input.date.trim();

  if (!date) {
    throw new Error("Choose a review date.");
  }

  return {
    date,
    winsText: input.winsText.trim(),
    improveText: input.improveText.trim(),
    tomorrowFocusText: input.tomorrowFocusText.trim(),
    moodRating: normalizeRating(input.moodRating, "Mood rating")
  };
}

export function subscribeToDailyReviews(
  userId: string,
  onReviews: (reviews: DailyReview[]) => void,
  onError: (error: string) => void,
  maxResults: number = READ_LIMITS.dailyReviewsPage
): Unsubscribe {
  const db = ensureFirestoreDb();
  const reviewsQuery = query(
    collection(db, "dailyReviews"),
    where("userId", "==", userId),
    orderBy("date", "desc"),
    queryLimit(maxResults)
  );

  return onSnapshot(
    reviewsQuery,
    (snapshot) => onReviews(mapDailyReviewsSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export async function fetchDailyReviews(userId: string): Promise<DailyReview[]> {
  const db = ensureFirestoreDb();
  const reviewsQuery = query(
    collection(db, "dailyReviews"),
    where("userId", "==", userId),
    orderBy("date", "desc")
  );

  return timedFirestoreRead("dailyReviews:recent", async () => {
    const snapshot = await getDocs(reviewsQuery);
    return mapDailyReviewsSnapshot(snapshot);
  });
}

export async function saveDailyReview(userId: string, input: DailyReviewInput): Promise<void> {
  const db = ensureFirestoreDb();
  const normalized = normalizeDailyReviewInput(input);
  const reviewRef = doc(db, "dailyReviews", deterministicUserDateId(userId, normalized.date));
  const snapshot = await getDoc(reviewRef);

  await setDoc(
    reviewRef,
    {
      ...(snapshot.exists() ? {} : { createdAt: serverTimestamp() }),
      id: reviewRef.id,
      userId,
      ...normalized,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

function normalizeWeeklyReviewInput(
  input: WeeklyReviewInput
): Omit<WeeklyReview, "id" | "userId" | "createdAt" | "updatedAt"> {
  const weekKey = input.weekKey.trim();

  if (!weekKey) {
    throw new Error("Choose a review week.");
  }

  return {
    weekKey,
    winsText: input.winsText.trim(),
    challengesText: input.challengesText.trim(),
    nextWeekFocusText: input.nextWeekFocusText.trim()
  };
}

export function subscribeToWeeklyReviews(
  userId: string,
  onReviews: (reviews: WeeklyReview[]) => void,
  onError: (error: string) => void,
  maxResults: number = READ_LIMITS.weeklyReviewsPage
): Unsubscribe {
  const db = ensureFirestoreDb();
  const reviewsQuery = query(
    collection(db, "weeklyReviews"),
    where("userId", "==", userId),
    orderBy("weekKey", "desc"),
    queryLimit(maxResults)
  );

  return onSnapshot(
    reviewsQuery,
    (snapshot) => onReviews(mapWeeklyReviewsSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export async function fetchWeeklyReviews(userId: string): Promise<WeeklyReview[]> {
  const db = ensureFirestoreDb();
  const reviewsQuery = query(
    collection(db, "weeklyReviews"),
    where("userId", "==", userId),
    orderBy("weekKey", "desc")
  );

  return timedFirestoreRead("weeklyReviews:recent", async () => {
    const snapshot = await getDocs(reviewsQuery);
    return mapWeeklyReviewsSnapshot(snapshot);
  });
}

export async function saveWeeklyReview(userId: string, input: WeeklyReviewInput): Promise<void> {
  const db = ensureFirestoreDb();
  const normalized = normalizeWeeklyReviewInput(input);
  const reviewRef = doc(db, "weeklyReviews", deterministicUserDateId(userId, normalized.weekKey));
  const snapshot = await getDoc(reviewRef);

  await setDoc(
    reviewRef,
    {
      ...(snapshot.exists() ? {} : { createdAt: serverTimestamp() }),
      id: reviewRef.id,
      userId,
      ...normalized,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

function normalizeStudyReminderInput(
  input: StudyReminderInput
): Omit<StudyReminder, "id" | "userId" | "read" | "createdAt"> {
  const title = input.title.trim();
  const message = input.message?.trim() ?? "";
  const date = input.date.trim();
  const status = normalizeStudyReminderStatus(input.status);

  if (!REMINDER_TYPES.includes(input.type)) {
    throw new Error("Choose a valid reminder type.");
  }

  if (!title) {
    throw new Error("Enter a reminder title.");
  }

  if (!date) {
    throw new Error("Choose a reminder date.");
  }

  return {
    type: normalizeStudyReminderType(input.type),
    title,
    message,
    date,
    time: input.time?.trim() ?? "",
    subjectId: input.subjectId?.trim() ?? "",
    subject: input.subject?.trim() ?? "",
    linkedRevisionId: input.linkedRevisionId?.trim() ?? "",
    linkedAssignmentId: input.linkedAssignmentId?.trim() ?? "",
    linkedExamId: input.linkedExamId?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
    status,
    updatedAt: null
  };
}

export function subscribeToStudyReminders(
  userId: string,
  onReminders: (reminders: StudyReminder[]) => void,
  onError: (error: string) => void,
  maxResults: number = READ_LIMITS.remindersPage
): Unsubscribe {
  const db = ensureFirestoreDb();
  const remindersQuery = query(
    collection(db, "studyReminders"),
    where("userId", "==", userId),
    orderBy("date", "asc"),
    queryLimit(maxResults)
  );

  return onSnapshot(
    remindersQuery,
    (snapshot) => onReminders(mapStudyRemindersSnapshot(snapshot)),
    (error) => onError(getFirestoreErrorMessage(error))
  );
}

export async function addStudyReminder(userId: string, input: StudyReminderInput): Promise<void> {
  const db = ensureFirestoreDb();
  const reminderRef = doc(collection(db, "studyReminders"));
  const normalized = normalizeStudyReminderInput(input);

  await setDoc(reminderRef, {
    id: reminderRef.id,
    userId,
    ...normalized,
    read: normalized.status !== "Active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateStudyReminder(reminderId: string, input: StudyReminderInput): Promise<void> {
  const db = ensureFirestoreDb();
  const normalized = normalizeStudyReminderInput(input);

  await updateDoc(doc(db, "studyReminders", reminderId), {
    ...normalized,
    read: normalized.status !== "Active",
    updatedAt: serverTimestamp()
  });
}

export async function fetchStudyReminders(userId: string): Promise<StudyReminder[]> {
  const db = ensureFirestoreDb();
  const remindersQuery = query(collection(db, "studyReminders"), where("userId", "==", userId), orderBy("date", "asc"));

  return timedFirestoreRead("reminders:allExport", async () => {
    const snapshot = await getDocs(remindersQuery);
    return mapStudyRemindersSnapshot(snapshot);
  });
}

export async function markStudyReminderRead(reminderId: string, read: boolean): Promise<void> {
  const db = ensureFirestoreDb();

  await updateDoc(doc(db, "studyReminders", reminderId), {
    read,
    status: read ? "Dismissed" : "Active",
    updatedAt: serverTimestamp()
  });
}

export async function setStudyReminderStatus(reminderId: string, status: StudyReminderStatus): Promise<void> {
  const db = ensureFirestoreDb();
  const normalizedStatus = normalizeStudyReminderStatus(status);

  await updateDoc(doc(db, "studyReminders", reminderId), {
    status: normalizedStatus,
    read: normalizedStatus !== "Active",
    updatedAt: serverTimestamp()
  });
}

export async function deleteStudyReminder(reminderId: string): Promise<void> {
  const db = ensureFirestoreDb();

  await deleteDoc(doc(db, "studyReminders", reminderId));
}

const STUDY_DATA_COLLECTIONS = [
  "tasks",
  "sessions",
  "notes",
  "assignments",
  "examSchedules",
  "marksEntries",
  "backlogItems",
  "dailyBattlePlans",
  "timetableBlocks",
  "scheduleProfiles",
  "revisionPlans",
  "syllabusSubjects",
  "syllabusChapters",
  "syllabusTopics",
  "habits",
  "habitCompletions",
  "mockTests",
  "studyGoals",
  "studyJournals",
  "studyTemplates",
  "dailyReviews",
  "weeklyReviews",
  "studyReminders"
] as const;

async function commitDeleteRefs(userId: string, refs: Array<{ path: string }>): Promise<number> {
  const db = ensureFirestoreDb();
  let deleted = 0;

  for (let index = 0; index < refs.length; index += 400) {
    const batch = writeBatch(db);
    const chunk = refs.slice(index, index + 400);

    chunk.forEach((ref) => batch.delete(doc(db, ref.path)));
    await batch.commit();
    deleted += chunk.length;
  }

  const streakRef = doc(db, "streaks", userId);
  const streakSnapshot = await getDoc(streakRef);

  if (streakSnapshot.exists()) {
    await deleteDoc(streakRef);
    deleted += 1;
  }

  return deleted;
}

export async function clearAllStudyData(userId: string): Promise<number> {
  const db = ensureFirestoreDb();
  const snapshots = await Promise.all(
    STUDY_DATA_COLLECTIONS.map((collectionName) =>
      getDocs(query(collection(db, collectionName), where("userId", "==", userId)))
    )
  );
  const refs = snapshots.flatMap((snapshot) => snapshot.docs.map((entry) => ({ path: entry.ref.path })));

  return commitDeleteRefs(userId, refs);
}

export async function requestAccountDeletion(userId: string, email?: string | null, reason?: string): Promise<AccountDeletionRequest> {
  const db = ensureFirestoreDb();
  const requestRef = doc(db, "accountDeletionRequests", userId);
  const profileRef = doc(db, "userProfiles", userId);
  const normalizedReason = reason?.trim() ?? "";

  await setDoc(
    requestRef,
    {
      id: userId,
      userId,
      email: email ?? "",
      reason: normalizedReason,
      status: "requested",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
  await updateDoc(profileRef, {
    deletionRequested: true,
    deletionRequestedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return {
    id: userId,
    userId,
    email: email ?? "",
    reason: normalizedReason,
    status: "requested",
    createdAt: null,
    updatedAt: null
  };
}
