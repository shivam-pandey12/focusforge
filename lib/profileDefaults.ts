import type { UserProfile } from "@/types";
import type { UserProfileInput } from "@/lib/firebase/firestore";

export const STUDY_GOAL_OPTIONS = [
  "Board exams",
  "JEE preparation",
  "NEET preparation",
  "School study",
  "College study",
  "Coding practice",
  "General productivity",
  "Custom"
];

export function getDefaultProfileInput(profile?: UserProfile | null): UserProfileInput {
  return {
    displayName: profile?.displayName ?? "",
    profileImageDataUrl: profile?.profileImageDataUrl ?? "",
    studyGoal: profile?.studyGoal ?? "General productivity",
    dailyStudyTargetMinutes: profile?.dailyStudyTargetMinutes ?? 120,
    preferredFocusDuration: profile?.preferredFocusDuration ?? 25,
    subjects: profile?.subjects ?? [],
    onboardingCompleted: profile?.onboardingCompleted ?? false,
    notificationEnabled: profile?.notificationEnabled ?? false,
    reminderTime: profile?.reminderTime ?? "18:00",
    revisionReminderEnabled: profile?.revisionReminderEnabled ?? true,
    habitReminderEnabled: profile?.habitReminderEnabled ?? true,
    taskReminderEnabled: profile?.taskReminderEnabled ?? true,
    emailNotificationsEnabled: profile?.emailNotificationsEnabled ?? true,
    welcomeEmailsEnabled: profile?.welcomeEmailsEnabled ?? true,
    paymentEmailsEnabled: profile?.paymentEmailsEnabled ?? true,
    planExpiryEmailsEnabled: profile?.planExpiryEmailsEnabled ?? true,
    weeklySummaryEmailsEnabled: profile?.weeklySummaryEmailsEnabled ?? true,
    weekStartDay: profile?.weekStartDay ?? 0
  };
}
