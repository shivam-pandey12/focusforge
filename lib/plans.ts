import type { UserProfile } from "@/types";

export type PlanTier = "free" | "pro" | "elite";
export type SubscriptionStatus = "free" | "trial" | "active" | "inactive" | "expired" | "manual";
export type BillingCycle = "none" | "monthly" | "season" | "yearly";
export type PaidPlanTier = Exclude<PlanTier, "free">;
export type PaidBillingCycle = Exclude<BillingCycle, "none">;
export type CheckoutBillingCycle = "monthly" | "season" | "yearly";

export type FeatureKey =
  | "dashboard"
  | "tasks"
  | "focusTimer"
  | "streaks"
  | "notes"
  | "calendar"
  | "basicAnalytics"
  | "advancedAnalytics"
  | "subjects"
  | "timetable"
  | "advancedTimetable"
  | "homework"
  | "examPlanner"
  | "marksTracker"
  | "revisionPlanner"
  | "topicTracker"
  | "backlogTracker"
  | "dailyBattlePlan"
  | "habits"
  | "goals"
  | "templates"
  | "dataExport"
  | "heatmap"
  | "fullHeatmap"
  | "mockTests"
  | "advancedMockAnalytics"
  | "weakAreas"
  | "productivityScore"
  | "journal"
  | "dailyReview"
  | "weeklyReview"
  | "reminders"
  | "premiumThemes"
  | "settings"
  | "billing";

export interface PlanLimits {
  notesLimit: number;
  sessionsHistoryDays: number;
  analyticsHistoryDays: number;
  revisionTopicsLimit: number;
  revisionPlansLimit: number;
  subjectsLimit: number;
  chaptersPerSubjectLimit: number;
  topicsPerChapterLimit: number;
  homeworkLimit: number;
  examSchedulesLimit: number;
  marksEntriesLimit: number;
  timetableProfilesLimit: number;
  backlogItemsLimit: number;
  battlePlanItemsLimit: number;
  mockTestsLimit: number;
  heatmapHistoryDays: number;
  templatesLimit: number;
  goalsLimit: number;
  habitsLimit: number;
}

export interface PlanDefinition {
  tier: PlanTier;
  displayName: string;
  shortName: string;
  description: string;
  seasonPrice: string;
  yearlyPrice: string;
  monthlyPrice?: string;
  badge?: string;
  highlights: string[];
  features: FeatureKey[];
  limits: PlanLimits;
}

const UNLIMITED = Number.POSITIVE_INFINITY;

export const PLAN_ORDER: PlanTier[] = ["free", "pro", "elite"];

export const PLAN_CONFIG: Record<PlanTier, PlanDefinition> = {
  free: {
    tier: "free",
    displayName: "Forge Starter",
    shortName: "Starter",
    description: "A useful daily student planner with limits that keep the free plan genuinely usable.",
    seasonPrice: "Rs. 0",
    yearlyPrice: "Rs. 0",
    highlights: [
      "5 subjects",
      "Basic weekly timetable",
      "Homework and exam planner",
      "Calendar, revision, focus, reminders",
      "20 marks entries",
      "20 backlog items",
      "3 daily battle moves",
      "Basic analytics and 30-day heatmap"
    ],
    features: [
      "dashboard",
      "tasks",
      "focusTimer",
      "streaks",
      "notes",
      "calendar",
      "basicAnalytics",
      "subjects",
      "timetable",
      "homework",
      "examPlanner",
      "marksTracker",
      "revisionPlanner",
      "topicTracker",
      "backlogTracker",
      "dailyBattlePlan",
      "heatmap",
      "reminders",
      "settings",
      "billing"
    ],
    limits: {
      notesLimit: 20,
      sessionsHistoryDays: 30,
      analyticsHistoryDays: 7,
      revisionTopicsLimit: 10,
      revisionPlansLimit: 10,
      subjectsLimit: 5,
      chaptersPerSubjectLimit: 10,
      topicsPerChapterLimit: 20,
      homeworkLimit: UNLIMITED,
      examSchedulesLimit: UNLIMITED,
      marksEntriesLimit: 20,
      timetableProfilesLimit: 1,
      backlogItemsLimit: 20,
      battlePlanItemsLimit: 3,
      mockTestsLimit: 0,
      heatmapHistoryDays: 30,
      templatesLimit: 3,
      goalsLimit: 3,
      habitsLimit: 3
    }
  },
  pro: {
    tier: "pro",
    displayName: "Forge Pro",
    shortName: "Pro",
    description: "A serious student system with advanced scheduling, exports, mock analytics, and higher limits.",
    seasonPrice: "Rs. 149 / 4 months",
    yearlyPrice: "Rs. 399 / year",
    monthlyPrice: "Rs. 49 / month",
    badge: "Most Popular",
    highlights: [
      "Unlimited core planner records",
      "Advanced timetable profiles",
      "6 battle-plan moves per day",
      "Mock test analytics",
      "Repair suggestions",
      "Advanced progress summaries",
      "Templates, habits, goals, and export"
    ],
    features: [
      "dashboard",
      "tasks",
      "focusTimer",
      "streaks",
      "notes",
      "calendar",
      "basicAnalytics",
      "advancedAnalytics",
      "timetable",
      "advancedTimetable",
      "subjects",
      "homework",
      "examPlanner",
      "marksTracker",
      "revisionPlanner",
      "topicTracker",
      "backlogTracker",
      "dailyBattlePlan",
      "habits",
      "goals",
      "templates",
      "dataExport",
      "heatmap",
      "fullHeatmap",
      "mockTests",
      "advancedMockAnalytics",
      "reminders",
      "settings",
      "billing"
    ],
    limits: {
      notesLimit: UNLIMITED,
      sessionsHistoryDays: UNLIMITED,
      analyticsHistoryDays: UNLIMITED,
      revisionTopicsLimit: UNLIMITED,
      revisionPlansLimit: UNLIMITED,
      subjectsLimit: UNLIMITED,
      chaptersPerSubjectLimit: UNLIMITED,
      topicsPerChapterLimit: UNLIMITED,
      homeworkLimit: UNLIMITED,
      examSchedulesLimit: UNLIMITED,
      marksEntriesLimit: UNLIMITED,
      timetableProfilesLimit: UNLIMITED,
      backlogItemsLimit: UNLIMITED,
      battlePlanItemsLimit: 6,
      mockTestsLimit: UNLIMITED,
      heatmapHistoryDays: 365,
      templatesLimit: UNLIMITED,
      goalsLimit: UNLIMITED,
      habitsLimit: UNLIMITED
    }
  },
  elite: {
    tier: "elite",
    displayName: "Forge Elite",
    shortName: "Elite",
    description: "Competitive exam power mode with full mock reports, weak-area signals, and review tools.",
    seasonPrice: "Rs. 299 / 4 months",
    yearlyPrice: "Rs. 699 / year",
    monthlyPrice: "Rs. 99 / month",
    highlights: [
      "Everything in Pro",
      "Full mock analytics reports",
      "Advanced repair flow",
      "Weak area detection",
      "Productivity score",
      "Study journal",
      "Daily and weekly reviews",
      "Premium themes coming soon"
    ],
    features: [
      "dashboard",
      "tasks",
      "focusTimer",
      "streaks",
      "notes",
      "calendar",
      "basicAnalytics",
      "advancedAnalytics",
      "timetable",
      "advancedTimetable",
      "subjects",
      "homework",
      "examPlanner",
      "marksTracker",
      "revisionPlanner",
      "topicTracker",
      "backlogTracker",
      "dailyBattlePlan",
      "habits",
      "goals",
      "templates",
      "dataExport",
      "heatmap",
      "fullHeatmap",
      "mockTests",
      "advancedMockAnalytics",
      "weakAreas",
      "productivityScore",
      "journal",
      "dailyReview",
      "weeklyReview",
      "reminders",
      "settings",
      "billing"
    ],
    limits: {
      notesLimit: UNLIMITED,
      sessionsHistoryDays: UNLIMITED,
      analyticsHistoryDays: UNLIMITED,
      revisionTopicsLimit: UNLIMITED,
      revisionPlansLimit: UNLIMITED,
      subjectsLimit: UNLIMITED,
      chaptersPerSubjectLimit: UNLIMITED,
      topicsPerChapterLimit: UNLIMITED,
      homeworkLimit: UNLIMITED,
      examSchedulesLimit: UNLIMITED,
      marksEntriesLimit: UNLIMITED,
      timetableProfilesLimit: UNLIMITED,
      backlogItemsLimit: UNLIMITED,
      battlePlanItemsLimit: 6,
      mockTestsLimit: UNLIMITED,
      heatmapHistoryDays: 365,
      templatesLimit: UNLIMITED,
      goalsLimit: UNLIMITED,
      habitsLimit: UNLIMITED
    }
  }
};

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  dashboard: "Dashboard",
  tasks: "Daily tasks",
  focusTimer: "Focus timer",
  streaks: "Streaks",
  notes: "Notes",
  calendar: "Calendar",
  basicAnalytics: "Basic analytics",
  advancedAnalytics: "Advanced analytics",
  subjects: "Subjects",
  timetable: "Timetable",
  advancedTimetable: "Advanced timetable",
  homework: "Homework tracker",
  examPlanner: "Exam planner",
  marksTracker: "Marks tracker",
  revisionPlanner: "Revision planner",
  topicTracker: "Topic tracker",
  backlogTracker: "Backlog tracker",
  dailyBattlePlan: "Daily battle plan",
  habits: "Habit tracker",
  goals: "Goals",
  templates: "Study templates",
  dataExport: "Data export",
  heatmap: "Focus heatmap",
  fullHeatmap: "Full heatmap history",
  mockTests: "Mock test analytics",
  advancedMockAnalytics: "Advanced mock analytics",
  weakAreas: "Weak area detection",
  productivityScore: "Productivity score",
  journal: "Study journal",
  dailyReview: "Daily review",
  weeklyReview: "Weekly review",
  reminders: "Reminders",
  premiumThemes: "Premium themes",
  settings: "Settings",
  billing: "Billing"
};

export interface RouteAccessRule {
  path: string;
  feature: FeatureKey;
  match: "exact" | "prefix";
}

export const ROUTE_ACCESS_RULES: RouteAccessRule[] = [
  { path: "/dashboard", feature: "dashboard", match: "exact" },
  { path: "/focus", feature: "focusTimer", match: "exact" },
  { path: "/notes", feature: "notes", match: "exact" },
  { path: "/calendar", feature: "calendar", match: "exact" },
  { path: "/analytics", feature: "basicAnalytics", match: "exact" },
  { path: "/subjects", feature: "subjects", match: "exact" },
  { path: "/timetable", feature: "timetable", match: "exact" },
  { path: "/homework", feature: "homework", match: "exact" },
  { path: "/exams", feature: "examPlanner", match: "exact" },
  { path: "/marks", feature: "marksTracker", match: "exact" },
  { path: "/revision", feature: "revisionPlanner", match: "exact" },
  { path: "/topics", feature: "topicTracker", match: "exact" },
  { path: "/backlog", feature: "backlogTracker", match: "exact" },
  { path: "/battle-plan", feature: "dailyBattlePlan", match: "exact" },
  { path: "/habits", feature: "habits", match: "exact" },
  { path: "/goals", feature: "goals", match: "exact" },
  { path: "/templates", feature: "templates", match: "exact" },
  { path: "/heatmap", feature: "heatmap", match: "exact" },
  { path: "/mock-tests", feature: "mockTests", match: "prefix" },
  { path: "/weak-areas", feature: "weakAreas", match: "exact" },
  { path: "/journal", feature: "journal", match: "exact" },
  { path: "/review/daily", feature: "dailyReview", match: "exact" },
  { path: "/review/weekly", feature: "weeklyReview", match: "exact" },
  { path: "/reminders", feature: "reminders", match: "exact" },
  { path: "/settings/data", feature: "settings", match: "exact" },
  { path: "/settings/billing", feature: "billing", match: "exact" },
  { path: "/settings", feature: "settings", match: "exact" },
  { path: "/billing", feature: "billing", match: "exact" },
  { path: "/pricing", feature: "billing", match: "exact" },
  { path: "/support", feature: "settings", match: "exact" },
  { path: "/docs", feature: "settings", match: "exact" }
];

export const ROUTE_ACCESS_AUDIT: Record<string, FeatureKey> = {
  "/dashboard": "dashboard",
  "/focus": "focusTimer",
  "/notes": "notes",
  "/calendar": "calendar",
  "/analytics": "basicAnalytics",
  "/subjects": "subjects",
  "/timetable": "timetable",
  "/homework": "homework",
  "/exams": "examPlanner",
  "/marks": "marksTracker",
  "/revision": "revisionPlanner",
  "/topics": "topicTracker",
  "/backlog": "backlogTracker",
  "/battle-plan": "dailyBattlePlan",
  "/habits": "habits",
  "/goals": "goals",
  "/templates": "templates",
  "/heatmap": "heatmap",
  "/mock-tests": "mockTests",
  "/weak-areas": "weakAreas",
  "/journal": "journal",
  "/review/daily": "dailyReview",
  "/review/weekly": "weeklyReview",
  "/reminders": "reminders",
  "/settings": "settings",
  "/settings/data": "settings",
  "/settings/billing": "billing",
  "/billing": "billing",
  "/pricing": "billing",
  "/support": "settings",
  "/docs": "settings"
};

export function normalizePlanTier(value: unknown): PlanTier {
  return value === "pro" || value === "elite" ? value : "free";
}

export function normalizeSubscriptionStatus(value: unknown): SubscriptionStatus {
  return value === "trial" ||
    value === "active" ||
    value === "inactive" ||
    value === "expired" ||
    value === "manual"
    ? value
    : "free";
}

export function normalizeBillingCycle(value: unknown): BillingCycle {
  return value === "monthly" || value === "season" || value === "yearly" ? value : "none";
}

function timestampToMillis(value: unknown): number | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "object" && value !== null && "toMillis" in value) {
    const toMillis = (value as { toMillis?: () => number }).toMillis;

    if (typeof toMillis === "function") {
      return toMillis.call(value);
    }
  }

  if (typeof value === "object" && value !== null && "toDate" in value) {
    const toDate = (value as { toDate?: () => Date }).toDate;

    if (typeof toDate === "function") {
      return toDate.call(value).getTime();
    }
  }

  const parsed = new Date(String(value)).getTime();

  return Number.isNaN(parsed) ? null : parsed;
}

export function calculatePlanExpiry(billingCycle: BillingCycle, from = new Date()): Date | null {
  if (billingCycle === "none") {
    return null;
  }

  const expiry = new Date(from);
  const days = billingCycle === "yearly" ? 365 : billingCycle === "season" ? 120 : 30;
  expiry.setDate(expiry.getDate() + days);

  return expiry;
}

export function isPlanExpired(
  profile?: Pick<UserProfile, "plan" | "planExpiresAt" | "subscriptionStatus"> | null,
  now = new Date()
): boolean {
  const storedPlan = normalizePlanTier(profile?.plan);

  if (storedPlan === "free") {
    return false;
  }

  const expiryMillis = timestampToMillis(profile?.planExpiresAt);

  if (!expiryMillis) {
    return false;
  }

  return expiryMillis <= now.getTime();
}

export function getStoredPlan(profile?: Pick<UserProfile, "plan"> | null): PlanTier {
  return normalizePlanTier(profile?.plan);
}

export function getEffectivePlan(
  profile?: Pick<UserProfile, "plan" | "planExpiresAt" | "subscriptionStatus"> | null,
  now = new Date()
): PlanTier {
  return isPlanExpired(profile, now) ? "free" : normalizePlanTier(profile?.plan);
}

export function getUserPlan(
  profile?: Pick<UserProfile, "plan" | "planExpiresAt" | "subscriptionStatus"> | null
): PlanTier {
  return getEffectivePlan(profile);
}

export function getPlanDefinition(plan: PlanTier): PlanDefinition {
  return PLAN_CONFIG[normalizePlanTier(plan)];
}

export function canUseFeature(plan: PlanTier, feature: FeatureKey): boolean {
  return PLAN_CONFIG[normalizePlanTier(plan)].features.includes(feature);
}

export function getPlanLimits(plan: PlanTier): PlanLimits {
  return PLAN_CONFIG[normalizePlanTier(plan)].limits;
}

export function getPlanLimit(plan: PlanTier, limit: keyof PlanLimits): number {
  return getPlanLimits(plan)[limit];
}

export function getRequiredPlan(feature: FeatureKey): PlanTier {
  return PLAN_ORDER.find((plan) => canUseFeature(plan, feature)) ?? "elite";
}

export function getRouteFeature(pathname: string): FeatureKey | null {
  const normalizedPath = pathname.split("?")[0].replace(/\/$/, "") || "/";
  const rule = ROUTE_ACCESS_RULES.find((item) => {
    if (item.match === "exact") {
      return item.path === normalizedPath;
    }

    return normalizedPath === item.path || normalizedPath.startsWith(`${item.path}/`);
  });

  return rule?.feature ?? null;
}

export function getRouteAccess(pathname: string, plan: PlanTier) {
  const feature = getRouteFeature(pathname);

  if (!feature) {
    return {
      feature: null,
      allowed: true,
      requiredPlan: "free" as PlanTier
    };
  }

  const requiredPlan = getRequiredPlan(feature);

  return {
    feature,
    allowed: canUseFeature(plan, feature),
    requiredPlan
  };
}

export function isAtLimit(count: number, limit: number): boolean {
  return Number.isFinite(limit) && count >= limit;
}

export function formatLimit(limit: number): string {
  return Number.isFinite(limit) ? String(limit) : "Unlimited";
}

export function getLimitUsage(count: number, limit: number): {
  count: number;
  limit: number;
  remaining: number;
  isLimited: boolean;
  isAtLimit: boolean;
  label: string;
} {
  const isLimited = Number.isFinite(limit);
  const remaining = isLimited ? Math.max(0, limit - count) : UNLIMITED;

  return {
    count,
    limit,
    remaining,
    isLimited,
    isAtLimit: isAtLimit(count, limit),
    label: isLimited ? `${count}/${limit}` : `${count}/Unlimited`
  };
}

export function canManagePlanFeature(profile: UserProfile | null | undefined, feature: FeatureKey): boolean {
  return canUseFeature(getUserPlan(profile), feature);
}
