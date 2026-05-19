"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import { getTodayDateKey } from "@/lib/date";
import {
  addStudyReminder,
  deleteStudyReminder,
  getFirestoreErrorMessage,
  markStudyReminderRead,
  READ_LIMITS,
  setStudyReminderStatus,
  subscribeToStudyReminders,
  updateStudyReminder,
  type StudyReminderInput
} from "@/lib/firebase/firestore";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { StudyReminder } from "@/types";

interface UseRemindersResult {
  reminders: StudyReminder[];
  dueToday: StudyReminder[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  notificationPermission: NotificationPermission | "unsupported";
  createReminder: (input: StudyReminderInput) => Promise<void>;
  saveReminder: (reminderId: string, input: StudyReminderInput) => Promise<void>;
  markRead: (reminderId: string, read: boolean) => Promise<void>;
  markDone: (reminderId: string) => Promise<void>;
  dismissReminder: (reminderId: string) => Promise<void>;
  reopenReminder: (reminderId: string) => Promise<void>;
  removeReminder: (reminderId: string) => Promise<void>;
  requestBrowserPermission: () => Promise<NotificationPermission | "unsupported">;
}

function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

function getReadVirtualStorageKey(userId: string): string {
  return `focusforge:virtual-reminders:${userId}`;
}

function readVirtualReminderIds(userId?: string | null): Set<string> {
  if (!userId || typeof window === "undefined") {
    return new Set();
  }

  try {
    const storedValue = window.localStorage.getItem(getReadVirtualStorageKey(userId));
    const parsedValue = storedValue ? (JSON.parse(storedValue) as unknown) : [];

    return new Set(Array.isArray(parsedValue) ? parsedValue.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeVirtualReminderIds(userId: string, reminderIds: Set<string>): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getReadVirtualStorageKey(userId), JSON.stringify([...reminderIds]));
  } catch {
    // Local reminder read state is best-effort; Firestore reminders remain authoritative.
  }
}

export function useReminders(userId?: string | null): UseRemindersResult {
  const [reminders, setReminders] = useState<StudyReminder[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(READ_LIMITS.remindersPage);
  const [readVirtualIds, setReadVirtualIds] = useState<Set<string>>(() => readVirtualReminderIds(userId));
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(
    getNotificationPermission()
  );
  const profile = useUserProfile(userId);

  useEffect(() => {
    if (!userId) {
      setReminders([]);
      setLoading(false);
      return;
    }

    const cacheKey = `studyReminders:${userId}:${pageSize}`;
    const cachedReminders = getClientCache<StudyReminder[]>(cacheKey);

    if (cachedReminders) {
      setReminders(cachedReminders);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      return subscribeToStudyReminders(
        userId,
        (nextReminders) => {
          setClientCache(cacheKey, nextReminders);
          setReminders(nextReminders);
          setLoading(false);
          setError(null);
        },
        (message) => {
          setError(message);
          setLoading(false);
        },
        pageSize
      );
    } catch (currentError) {
      setError(getFirestoreErrorMessage(currentError));
      setLoading(false);
    }
  }, [pageSize, userId]);

  useEffect(() => {
    setReadVirtualIds(readVirtualReminderIds(userId));
  }, [userId]);

  const virtualDailyReminder = useMemo<StudyReminder | null>(() => {
    if (!userId || !profile.profile?.notificationEnabled) {
      return null;
    }

    const today = getTodayDateKey();
    const reminderId = `virtual-daily-study-${today}`;

    return {
      id: reminderId,
      userId,
      type: "daily-study",
      title: "Daily study target",
      message: `Aim for ${profile.profile.dailyStudyTargetMinutes} minutes today.`,
      date: today,
      time: profile.profile.reminderTime,
      status: readVirtualIds.has(reminderId) ? "Done" : "Active",
      read: readVirtualIds.has(reminderId),
      createdAt: null
    };
  }, [profile.profile, readVirtualIds, userId]);

  const mergedReminders = useMemo(
    () => (virtualDailyReminder ? [virtualDailyReminder, ...reminders] : reminders),
    [reminders, virtualDailyReminder]
  );

  const createReminder = useCallback(
    async (input: StudyReminderInput) => {
      if (!userId) {
        throw new Error("Login is required before creating reminders.");
      }

      await addStudyReminder(userId, input);
    },
    [userId]
  );

  const loadMore = useCallback(() => {
    setPageSize((currentSize) => currentSize + READ_LIMITS.remindersPage);
  }, []);

  const saveReminder = useCallback(async (reminderId: string, input: StudyReminderInput) => {
    if (reminderId.startsWith("virtual-")) {
      return;
    }

    await updateStudyReminder(reminderId, input);
  }, []);

  const markRead = useCallback(async (reminderId: string, read: boolean) => {
    if (reminderId.startsWith("virtual-")) {
      if (!userId) {
        return;
      }

      setReadVirtualIds((currentIds) => {
        const nextIds = new Set(currentIds);

        if (read) {
          nextIds.add(reminderId);
        } else {
          nextIds.delete(reminderId);
        }

        writeVirtualReminderIds(userId, nextIds);
        return nextIds;
      });
      return;
    }

    await markStudyReminderRead(reminderId, read);
  }, [userId]);

  const markDone = useCallback(async (reminderId: string) => {
    if (reminderId.startsWith("virtual-")) {
      await markRead(reminderId, true);
      return;
    }

    await setStudyReminderStatus(reminderId, "Done");
  }, [markRead]);

  const dismissReminder = useCallback(async (reminderId: string) => {
    if (reminderId.startsWith("virtual-")) {
      await markRead(reminderId, true);
      return;
    }

    await setStudyReminderStatus(reminderId, "Dismissed");
  }, [markRead]);

  const reopenReminder = useCallback(async (reminderId: string) => {
    if (reminderId.startsWith("virtual-")) {
      await markRead(reminderId, false);
      return;
    }

    await setStudyReminderStatus(reminderId, "Active");
  }, [markRead]);

  const removeReminder = useCallback(async (reminderId: string) => {
    if (reminderId.startsWith("virtual-")) {
      return;
    }

    await deleteStudyReminder(reminderId);
  }, []);

  const requestBrowserPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported");
      return "unsupported";
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    return permission;
  }, []);

  const today = getTodayDateKey();
  const dueToday = mergedReminders.filter((reminder) => reminder.date <= today && reminder.status !== "Done" && reminder.status !== "Dismissed" && !reminder.read);
  const unreadCount = mergedReminders.filter((reminder) => reminder.status !== "Done" && reminder.status !== "Dismissed" && !reminder.read).length;

  return {
    reminders: mergedReminders,
    dueToday,
    unreadCount,
    loading: loading || profile.loading,
    error: error ?? profile.error,
    hasMore: reminders.length >= pageSize,
    loadMore,
    notificationPermission,
    createReminder,
    saveReminder,
    markRead,
    markDone,
    dismissReminder,
    reopenReminder,
    removeReminder,
    requestBrowserPermission
  };
}
