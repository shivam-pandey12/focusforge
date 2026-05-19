import { getTodayDateKey, isYesterday } from "@/lib/date";
import type { StudyStreak } from "@/types";

export interface NextStreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
}

export function getNextStreakState(
  currentStreak: StudyStreak | null,
  todayDateKey = getTodayDateKey()
): NextStreakState {
  if (!currentStreak) {
    return {
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: todayDateKey
    };
  }

  if (currentStreak.lastActiveDate === todayDateKey) {
    const current = currentStreak.currentStreak;

    return {
      currentStreak: current,
      longestStreak: Math.max(currentStreak.longestStreak ?? current, current),
      lastActiveDate: todayDateKey
    };
  }

  if (isYesterday(currentStreak.lastActiveDate)) {
    const next = currentStreak.currentStreak + 1;

    return {
      currentStreak: next,
      longestStreak: Math.max(currentStreak.longestStreak ?? currentStreak.currentStreak, next),
      lastActiveDate: todayDateKey
    };
  }

  return {
    currentStreak: 1,
    longestStreak: Math.max(currentStreak.longestStreak ?? 0, 1),
    lastActiveDate: todayDateKey
  };
}
