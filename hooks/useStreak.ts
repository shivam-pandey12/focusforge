"use client";

import { useEffect, useState } from "react";
import { getFirestoreErrorMessage, subscribeToStreak } from "@/lib/firebase/firestore";
import { getClientCache, hasClientCache, setClientCache } from "@/lib/clientCache";
import type { StudyStreak } from "@/types";

interface UseStreakResult {
  streak: StudyStreak | null;
  currentStreak: number;
  longestStreak: number;
  loading: boolean;
  error: string | null;
}

export function useStreak(userId?: string | null): UseStreakResult {
  const [streak, setStreak] = useState<StudyStreak | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setStreak(null);
      setLoading(false);
      return;
    }

    const cacheKey = `streak:${userId}`;

    if (hasClientCache(cacheKey)) {
      setStreak(getClientCache<StudyStreak | null>(cacheKey));
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const unsubscribe = subscribeToStreak(
        userId,
        (nextStreak) => {
          setClientCache(cacheKey, nextStreak);
          setStreak(nextStreak);
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

  return {
    streak,
    currentStreak: streak?.currentStreak ?? 0,
    longestStreak: streak?.longestStreak ?? streak?.currentStreak ?? 0,
    loading,
    error
  };
}
