import type { Timestamp } from "firebase/firestore";
import type { BillingCycle, PlanTier, SubscriptionStatus } from "@/lib/plans";

export interface AppUser {
  id: string;
  email: string;
  createdAt: Timestamp | null;
}

export interface StudyTask {
  id: string;
  userId: string;
  title: string;
  duration: number;
  subject?: string;
  completed: boolean;
  date: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  completedAt?: Timestamp | null;
}

export type FocusSessionStatus = "completed" | "abandoned" | "paused";

export interface StudySession {
  id: string;
  userId: string;
  taskId: string;
  taskTitle: string;
  subject?: string;
  subjectId?: string;
  duration: number;
  plannedDuration?: number;
  actualDuration?: number;
  startedAt?: Timestamp | null;
  endedAt?: Timestamp | null;
  status?: FocusSessionStatus;
  revisionPlanId?: string;
  assignmentId?: string;
  backlogItemId?: string;
  sourceType?: FocusSessionSourceType;
  sourceId?: string;
  battlePlanId?: string;
  battlePlanItemId?: string;
  chapterId?: string;
  topicId?: string;
  notes?: string;
  completedAt: Timestamp | null;
  date: string;
}

export interface StudyStreak {
  userId: string;
  currentStreak: number;
  longestStreak?: number;
  lastActiveDate: string;
  updatedAt: Timestamp | null;
}

export interface StudyNote {
  id: string;
  userId: string;
  title: string;
  content: string;
  subject?: string;
  linkedTaskId?: string;
  linkedTaskTitle?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface TimetableBlock {
  id: string;
  userId: string;
  title: string;
  subjectId?: string;
  subject: string;
  classType?: TimetableClassType;
  dayOfWeek: number;
  date?: string;
  startTime: string;
  endTime: string;
  duration: number;
  teacherName?: string;
  location?: string;
  notes?: string;
  isRecurring: boolean;
  scheduleMode?: TimetableScheduleMode;
  scheduleProfileId?: string;
  scheduleProfileName?: string;
  weekGroup?: TimetableWeekGroup;
  cycleDayNumber?: number | null;
  cycleLength?: number | null;
  effectiveFrom?: string;
  effectiveUntil?: string;
  isActive?: boolean;
  conflictIgnored?: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type TimetableClassType = "School" | "Coaching" | "Self-study" | "Online" | "Other";
export type TimetableScheduleMode = "weekly" | "alternateWeek" | "dayCycle";
export type TimetableWeekGroup = "A" | "B" | "Both";
export type ScheduleProfileType = "School" | "Coaching" | "Self-study" | "Exam Week" | "Vacation" | "Custom";

export interface ScheduleProfile {
  id: string;
  userId: string;
  name: string;
  type: ScheduleProfileType;
  color?: string;
  description?: string;
  isActive: boolean;
  scheduleMode: TimetableScheduleMode;
  activeWeek: Exclude<TimetableWeekGroup, "Both">;
  cycleLength: number;
  activeCycleDay: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type RevisionType = "Theory" | "Formula" | "Question Practice" | "Mistake Review" | "Full Chapter";
export type RevisionStatus = "Pending" | "Done" | "Skipped";
export type TopicStudyStatus =
  | "Not Started"
  | "Learning"
  | "Revised Once"
  | "Weak"
  | "Backlog"
  | "Strong"
  | "Completed";
export type BacklogLevel = "Light" | "Medium" | "Heavy";
export type BacklogReason = "Missed Class" | "Weak Concept" | "Low Marks" | "Not Revised" | "Homework Pending" | "Other";
export type BacklogStatus = "Not Started" | "In Progress" | "Cleared";
export type BattlePlanItemType = "Homework" | "Revision" | "Backlog" | "Exam Prep" | "Weak Topic" | "Focus Session" | "General Study";
export type BattlePlanItemStatus = "Pending" | "Done" | "Skipped";
export type BattlePlanPriority = "Low" | "Medium" | "High";
export type BattlePlanSourceType = "assignment" | "revision" | "backlog" | "exam" | "marks" | "mockTest" | "topic" | "general";
export type FocusSessionSourceType = BattlePlanSourceType | "task" | "subject" | "battle-plan";

export interface RevisionPlan {
  id: string;
  userId: string;
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
  nextRevisionDate: string;
  dueDate?: string;
  revisionDate?: string;
  lastRevisedDate?: string;
  revisionCount: number;
  completed: boolean;
  completedAt?: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface SyllabusSubject {
  id: string;
  userId: string;
  name: string;
  color?: string;
  icon?: string;
  targetType?: "score" | "percentage";
  targetValue?: number | null;
  description?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type AssignmentPriority = "Low" | "Medium" | "High";
export type AssignmentStatus = "Pending" | "In Progress" | "Completed";

export interface StudyAssignment {
  id: string;
  userId: string;
  title: string;
  subjectId?: string;
  subject: string;
  dueDate: string;
  priority: AssignmentPriority;
  status: AssignmentStatus;
  estimatedMinutes?: number | null;
  notes?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  completedAt?: Timestamp | null;
}

export interface ExamSchedule {
  id: string;
  userId: string;
  name: string;
  subjectId?: string;
  subject?: string;
  fullSyllabus: boolean;
  date: string;
  startTime?: string;
  durationMinutes?: number | null;
  totalMarks?: number | null;
  syllabusNotes?: string;
  notes?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type MarksEntryScope =
  | "Subject Test"
  | "Full Syllabus"
  | "Chapter Test"
  | "Practice Test"
  | "School Exam"
  | "Coaching Test"
  | "Other";

export type MistakeTag =
  | "Concept Error"
  | "Calculation Mistake"
  | "Silly Mistake"
  | "Time Pressure"
  | "Formula Forgotten"
  | "Not Revised"
  | "Guessed Wrong"
  | "Skipped Questions"
  | "Other";

export interface MarksEntry {
  id: string;
  userId: string;
  testName: string;
  subjectId?: string;
  subject?: string;
  examScheduleId?: string;
  scope: MarksEntryScope;
  date: string;
  score: number;
  totalMarks: number;
  percentage: number;
  rank?: number | null;
  percentile?: number | null;
  durationMinutes?: number | null;
  mistakeTags: MistakeTag[];
  mistakeNotes?: string;
  notes?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface SyllabusChapter {
  id: string;
  userId: string;
  subjectId: string;
  name: string;
  status?: TopicStudyStatus;
  statusNotes?: string;
  statusUpdatedAt?: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface SyllabusTopic {
  id: string;
  userId: string;
  subjectId: string;
  chapterId: string;
  name: string;
  completed: boolean;
  status?: TopicStudyStatus;
  statusNotes?: string;
  statusUpdatedAt?: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface BacklogItem {
  id: string;
  userId: string;
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
  estimatedMinutes?: number | null;
  status: BacklogStatus;
  priority: AssignmentPriority;
  notes?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  clearedAt?: Timestamp | null;
}

export interface DailyBattlePlanItem {
  id: string;
  title: string;
  type: BattlePlanItemType;
  subjectId?: string;
  subject?: string;
  subjectColor?: string;
  subjectIcon?: string;
  recommendedDuration: number;
  priority: BattlePlanPriority;
  score: number;
  reason: string;
  suggestedAction: string;
  sourceType: BattlePlanSourceType;
  sourceId?: string;
  href: string;
  status: BattlePlanItemStatus;
  overflow?: boolean;
}

export interface DailyBattlePlan {
  id: string;
  userId: string;
  date: string;
  availableMinutes: number;
  items: DailyBattlePlanItem[];
  generatedAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface StudyHabit {
  id: string;
  userId: string;
  title: string;
  description?: string;
  frequency: "daily";
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface HabitCompletion {
  id: string;
  userId: string;
  habitId: string;
  date: string;
  completedAt: Timestamp | null;
}

export type MockExamType = "JEE Main" | "JEE Advanced" | "NEET" | "Boards" | "School" | "Coaching" | "Custom";
export type MockPerformanceLevel = "Strong" | "Average" | "Weak" | "Critical";
export type MockMistakeTag = MistakeTag | "Misread Question" | "Overthinking";

export interface MockSubjectBreakdown {
  id: string;
  subjectId?: string;
  subject: string;
  subjectColor?: string;
  subjectIcon?: string;
  score: number;
  totalMarks: number;
  percentage: number;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  accuracy: number;
  timeSpentMinutes?: number | null;
  notes?: string;
}

export interface MockTopicAnalysis {
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
  attempted?: number | null;
  correct?: number | null;
  incorrect?: number | null;
  skipped?: number | null;
  mistakeTags: MockMistakeTag[];
  notes?: string;
}

export interface MockTimeAnalysis {
  totalTimeSpentMinutes?: number | null;
  timePressure: boolean;
  slowSubject?: string;
  rushedSubject?: string;
  notes?: string;
}

export interface MockTestResult {
  id: string;
  userId: string;
  title: string;
  examType?: MockExamType | string;
  subject?: string;
  subjectId?: string;
  subjectColor?: string;
  subjectIcon?: string;
  score: number;
  totalMarks: number;
  percentage: number;
  percentile?: number | null;
  rank?: number | null;
  totalQuestions: number;
  attemptedQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  skippedQuestions: number;
  accuracy: number;
  timeTakenMinutes: number;
  testDate: string;
  subjectBreakdowns: MockSubjectBreakdown[];
  topicAnalyses: MockTopicAnalysis[];
  mistakeTags: MockMistakeTag[];
  timeAnalysis?: MockTimeAnalysis | null;
  notes?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type StudyGoalType =
  | "studyHours"
  | "taskCompletion"
  | "subjectCompletion"
  | "chapterCompletion"
  | "mockTestScore"
  | "habitConsistency";

export type StudyGoalStatus = "active" | "completed";

export interface StudyGoal {
  id: string;
  userId: string;
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
  status: StudyGoalStatus;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface StudyJournalEntry {
  id: string;
  userId: string;
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
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface HeatmapDay {
  date: string;
  minutes: number;
  sessionCount: number;
  sessions: StudySession[];
  intensity: 0 | 1 | 2 | 3 | 4;
}

export interface ProductivityScore {
  date: string;
  score: number;
  weeklyAverage: number;
  breakdown: {
    studyTime: number;
    sessions: number;
    tasks: number;
    habits: number;
    revisions: number;
    streak: number;
  };
  suggestions: string[];
  weeklyBars: { date: string; score: number }[];
}

export type WeakAreaStatus = "Strong area" | "Good progress" | "Needs attention" | "Falling behind";

export interface WeakAreaInsight {
  subject: string;
  status: WeakAreaStatus;
  score: number;
  reasons: string[];
  nextAction: string;
}

export interface UserProfile {
  userId: string;
  displayName?: string;
  profileImageDataUrl?: string;
  plan: PlanTier;
  subscriptionStatus: SubscriptionStatus;
  billingCycle: BillingCycle;
  planStartedAt: Timestamp | null;
  planExpiresAt?: Timestamp | null;
  trialEndsAt?: Timestamp | null;
  cancelAtPeriodEnd: boolean;
  razorpayCustomerId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySubscriptionId?: string;
  lastPaymentVerifiedAt?: Timestamp | null;
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
  deletionRequested?: boolean;
  deletionRequestedAt?: Timestamp | null;
  weekStartDay: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type PaymentStatus = "created" | "paid" | "failed" | "verified" | "refunded";

export interface PaymentRecord {
  id: string;
  userId: string;
  plan: Exclude<PlanTier, "free">;
  billingCycle: Exclude<BillingCycle, "none">;
  amount: number;
  currency: "INR";
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  status: PaymentStatus;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  verifiedAt?: Timestamp | null;
}

export type BillingEventType =
  | "payment_verified"
  | "plan_activated"
  | "plan_expired"
  | "manual_dev_switch"
  | "admin_profile_update"
  | "webhook_payment_captured"
  | "webhook_payment_failed";

export type BillingEventSource = "api" | "webhook" | "development" | "system";

export interface BillingEvent {
  id: string;
  userId?: string;
  type: BillingEventType;
  plan?: PlanTier;
  billingCycle?: BillingCycle;
  paymentId?: string;
  orderId?: string;
  source: BillingEventSource;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: Timestamp | null;
}

export interface SubscriptionEvent {
  id: string;
  userId?: string;
  eventType: string;
  razorpayEntityId: string;
  processed: boolean;
  receivedAt: Timestamp | null;
  rawPayloadSummary?: Record<string, string | number | boolean | null>;
}

export type SupportTicketCategory =
  | "payment_issue"
  | "plan_not_active"
  | "account_issue"
  | "account_data_issue"
  | "feature_issue"
  | "feature_request"
  | "bug_report"
  | "general_question"
  | "other";

export type SupportTicketStatus = "open" | "in_review" | "resolved";
export type SupportSeverity = "low" | "medium" | "high" | "critical";

export interface SupportTicket {
  id: string;
  userId?: string;
  name?: string;
  email: string;
  category: SupportTicketCategory;
  subject: string;
  message: string;
  severity?: SupportSeverity;
  relatedRoute?: string;
  paymentId?: string;
  orderId?: string;
  screenshotUrl?: string;
  browserInfo?: string;
  deviceInfo?: string;
  status: SupportTicketStatus;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type FeedbackType = "bug" | "feature" | "rating" | "other";
export type FeedbackStatus = "new" | "reviewed" | "planned" | "fixed" | "closed";

export interface FeedbackEntry {
  id: string;
  userId?: string;
  email?: string;
  type: FeedbackType;
  title: string;
  description: string;
  severity?: SupportSeverity;
  relatedRoute?: string;
  browserInfo?: string;
  deviceInfo?: string;
  rating?: number;
  pageUrl?: string;
  userAgent?: string;
  status: FeedbackStatus;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type EmailEventType = "welcome" | "payment_success" | "plan_expiry_reminder" | "weekly_summary";
export type EmailEventStatus = "queued" | "sent" | "failed" | "skipped";

export interface EmailEvent {
  id: string;
  userId: string;
  type: EmailEventType;
  status: EmailEventStatus;
  createdAt: Timestamp | null;
  sentAt?: Timestamp | null;
  error?: string;
}

export interface AccountDeletionRequest {
  id: string;
  userId: string;
  email?: string;
  status: "requested" | "in_review" | "completed" | "cancelled";
  reason?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type StudyTemplateType = "focus" | "dailyRoutine" | "weeklyTimetable" | "revisionCycle" | "examPrep";

export interface StudyTemplateTaskConfig {
  title: string;
  subject?: string;
  duration?: number;
}

export interface StudyTemplateTimetableConfig {
  title: string;
  subject: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface StudyTemplateRevisionConfig {
  title: string;
  subject: string;
  notes?: string;
  nextRevisionDate?: string;
}

export interface StudyTemplateHabitConfig {
  title: string;
  description?: string;
}

export interface StudyTemplateConfig {
  tasks?: StudyTemplateTaskConfig[];
  timetableBlocks?: StudyTemplateTimetableConfig[];
  revisions?: StudyTemplateRevisionConfig[];
  habits?: StudyTemplateHabitConfig[];
}

export interface StudyTemplate {
  id: string;
  userId: string;
  title: string;
  description: string;
  type: StudyTemplateType;
  config: StudyTemplateConfig;
  isSystemTemplate: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface DailyReview {
  id: string;
  userId: string;
  date: string;
  winsText: string;
  improveText: string;
  tomorrowFocusText: string;
  moodRating: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface WeeklyReview {
  id: string;
  userId: string;
  weekKey: string;
  winsText: string;
  challengesText: string;
  nextWeekFocusText: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type StudyReminderType =
  | "task"
  | "revision"
  | "homework"
  | "exam"
  | "general-study"
  | "habit"
  | "goal"
  | "daily-study";

export type StudyReminderStatus = "Active" | "Done" | "Dismissed";

export interface StudyReminder {
  id: string;
  userId: string;
  type: StudyReminderType;
  title: string;
  message: string;
  date: string;
  time?: string;
  subjectId?: string;
  subject?: string;
  linkedRevisionId?: string;
  linkedAssignmentId?: string;
  linkedExamId?: string;
  notes?: string;
  status?: StudyReminderStatus;
  read: boolean;
  createdAt: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface DayActivity {
  date: string;
  sessions: StudySession[];
  completedTasks: StudyTask[];
  studyMinutes: number;
}

export interface QueuedFocusSession {
  queuedId: string;
  userId: string;
  task: {
    id: string;
    userId: string;
    title: string;
    duration: number;
    subject?: string;
    completed: boolean;
    date: string;
  };
  queuedAt: string;
}

export interface AuthState {
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  } | null;
  loading: boolean;
  error: string | null;
}
