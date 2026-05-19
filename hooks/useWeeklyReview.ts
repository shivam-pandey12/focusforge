"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import { getWeekKey } from "@/lib/date";
import {
  getFirestoreErrorMessage,
  READ_LIMITS,
  saveWeeklyReview,
  subscribeToWeeklyReviews,
  type WeeklyReviewInput
} from "@/lib/firebase/firestore";
import type { WeeklyReview } from "@/types";

interface UseWeeklyReviewResult {
  reviews: WeeklyReview[];
  currentReview: WeeklyReview | null;
  weekKey: string;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  saveReview: (input: WeeklyReviewInput) => Promise<void>;
}

export function useWeeklyReview(userId?: string | null, weekKey = getWeekKey()): UseWeeklyReviewResult {
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(READ_LIMITS.weeklyReviewsPage);

  useEffect(() => {
    if (!userId) {
      setReviews([]);
      setLoading(false);
      return;
    }

    const cacheKey = `weeklyReviews:${userId}:${pageSize}`;
    const cachedReviews = getClientCache<WeeklyReview[]>(cacheKey);

    if (cachedReviews) {
      setReviews(cachedReviews);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      return subscribeToWeeklyReviews(
        userId,
        (nextReviews) => {
          setClientCache(cacheKey, nextReviews);
          setReviews(nextReviews);
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

  const loadMore = useCallback(() => {
    setPageSize((currentSize) => currentSize + READ_LIMITS.weeklyReviewsPage);
  }, []);

  const saveReview = useCallback(
    async (input: WeeklyReviewInput) => {
      if (!userId) {
        throw new Error("Login is required before saving weekly reviews.");
      }

      await saveWeeklyReview(userId, input);
    },
    [userId]
  );

  const currentReview = useMemo(
    () => reviews.find((review) => review.weekKey === weekKey) ?? null,
    [reviews, weekKey]
  );

  return { reviews, currentReview, weekKey, loading, error, hasMore: reviews.length >= pageSize, loadMore, saveReview };
}
