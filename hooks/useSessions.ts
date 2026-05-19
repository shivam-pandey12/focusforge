"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getFirestoreErrorMessage,
  saveFocusSession,
  saveCompletedFocusSession,
  subscribeToTodaySessions,
  type FocusSessionInput
} from "@/lib/firebase/firestore";
import {
  getPendingFocusSessions,
  queuePendingFocusSession,
  removePendingFocusSession
} from "@/lib/offlineSessions";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import type { StudySession, StudyTask } from "@/types";

interface UseSessionsResult {
  sessions: StudySession[];
  totalStudyTimeToday: number;
  sessionsToday: number;
  loading: boolean;
  error: string | null;
  pendingOfflineSessions: number;
  saveSession: (task: StudyTask) => Promise<void>;
  saveFocusSession: (input: FocusSessionInput) => Promise<void>;
}

interface UseFocusSessionActionsResult {
  error: string | null;
  pendingOfflineSessions: number;
  saveSession: (task: StudyTask) => Promise<void>;
  saveFocusSession: (input: FocusSessionInput) => Promise<void>;
}

function usePendingSessionFlush(userId?: string | null) {
  const [pendingOfflineSessions, setPendingOfflineSessions] = useState(0);

  useEffect(() => {
    if (!userId || typeof window === "undefined") {
      return;
    }

    async function flushPendingSessions() {
      if (!userId || !window.navigator.onLine) {
        return;
      }

      const pending = getPendingFocusSessions(userId);
      setPendingOfflineSessions(pending.length);

      for (const item of pending) {
        try {
          await saveCompletedFocusSession(userId, {
            ...item.task,
            createdAt: null,
            updatedAt: null,
            completedAt: null
          });
          removePendingFocusSession(userId, item.queuedId);
        } catch {
          break;
        }
      }

      setPendingOfflineSessions(getPendingFocusSessions(userId).length);
    }

    setPendingOfflineSessions(getPendingFocusSessions(userId).length);
    void flushPendingSessions();
    window.addEventListener("online", flushPendingSessions);

    return () => window.removeEventListener("online", flushPendingSessions);
  }, [userId]);

  return { pendingOfflineSessions, setPendingOfflineSessions };
}

export function useSessions(userId?: string | null): UseSessionsResult {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const { pendingOfflineSessions, setPendingOfflineSessions } = usePendingSessionFlush(userId);

  useEffect(() => {
    if (!userId) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const cacheKey = `sessions:today:${userId}`;
    const cachedSessions = getClientCache<StudySession[]>(cacheKey);

    if (cachedSessions) {
      setSessions(cachedSessions);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const unsubscribe = subscribeToTodaySessions(
        userId,
        (nextSessions) => {
          setClientCache(cacheKey, nextSessions);
          setSessions(nextSessions);
          setLoading(false);
          setError(null);
        },
        (message) => {
          setError(message);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (currentError) {
      setError(getFirestoreErrorMessage(currentError));
      setLoading(false);
    }
  }, [userId]);

  const totalStudyTimeToday = useMemo(
    () => sessions.reduce((total, session) => total + (session.status === "abandoned" ? 0 : session.actualDuration ?? session.duration), 0),
    [sessions]
  );

  const saveSession = useCallback(
    async (task: StudyTask) => {
      if (!userId) {
        throw new Error("Login is required before saving a session.");
      }

      if (typeof window !== "undefined" && !window.navigator.onLine) {
        queuePendingFocusSession(userId, task);
        setPendingOfflineSessions(getPendingFocusSessions(userId).length);
        return;
      }

      await saveCompletedFocusSession(userId, task);
    },
    [setPendingOfflineSessions, userId]
  );

  const saveLinkedFocusSession = useCallback(
    async (input: FocusSessionInput) => {
      if (!userId) {
        throw new Error("Login is required before saving a session.");
      }

      await saveFocusSession(userId, input);
    },
    [userId]
  );

  return {
    sessions,
    totalStudyTimeToday,
    sessionsToday: sessions.length,
    loading,
    error,
    pendingOfflineSessions,
    saveSession,
    saveFocusSession: saveLinkedFocusSession
  };
}

export function useFocusSessionActions(userId?: string | null): UseFocusSessionActionsResult {
  const [error, setError] = useState<string | null>(null);
  const { pendingOfflineSessions, setPendingOfflineSessions } = usePendingSessionFlush(userId);

  const saveSession = useCallback(
    async (task: StudyTask) => {
      if (!userId) {
        throw new Error("Login is required before saving a session.");
      }

      if (typeof window !== "undefined" && !window.navigator.onLine) {
        queuePendingFocusSession(userId, task);
        setPendingOfflineSessions(getPendingFocusSessions(userId).length);
        setError(null);
        return;
      }

      try {
        await saveCompletedFocusSession(userId, task);
        setError(null);
      } catch (currentError) {
        const message = getFirestoreErrorMessage(currentError);
        setError(message);
        throw new Error(message);
      }
    },
    [setPendingOfflineSessions, userId]
  );

  const saveLinkedFocusSession = useCallback(
    async (input: FocusSessionInput) => {
      if (!userId) {
        throw new Error("Login is required before saving a session.");
      }

      try {
        await saveFocusSession(userId, input);
        setError(null);
      } catch (currentError) {
        const message = getFirestoreErrorMessage(currentError);
        setError(message);
        throw new Error(message);
      }
    },
    [userId]
  );

  return {
    error,
    pendingOfflineSessions,
    saveSession,
    saveFocusSession: saveLinkedFocusSession
  };
}
