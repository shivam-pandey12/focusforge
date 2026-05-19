"use client";

import type { QueuedFocusSession, StudyTask } from "@/types";

const STORAGE_PREFIX = "focusforge:pending-sessions:";

function getStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function getPendingFocusSessions(userId: string): QueuedFocusSession[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));

    return raw ? (JSON.parse(raw) as QueuedFocusSession[]) : [];
  } catch {
    return [];
  }
}

export function queuePendingFocusSession(userId: string, task: StudyTask): void {
  if (typeof window === "undefined") {
    return;
  }

  const pending = getPendingFocusSessions(userId);
  const alreadyQueued = pending.some((item) => item.task.id === task.id);

  if (alreadyQueued) {
    return;
  }

  const nextPending: QueuedFocusSession[] = [
    ...pending,
    {
      queuedId: `${task.id}-${Date.now()}`,
      userId,
      task: {
        id: task.id,
        userId: task.userId,
        title: task.title,
        duration: task.duration,
        subject: task.subject,
        completed: task.completed,
        date: task.date
      },
      queuedAt: new Date().toISOString()
    }
  ];

  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(nextPending));
}

export function removePendingFocusSession(userId: string, queuedId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const nextPending = getPendingFocusSessions(userId).filter((item) => item.queuedId !== queuedId);
  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(nextPending));
}
