"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import { getTodayDateKey } from "@/lib/date";
import {
  getFirestoreErrorMessage,
  READ_LIMITS,
  saveDailyReview,
  subscribeToDailyReviews,
  type DailyReviewInput
} from "@/lib/firebase/firestore";
import type { DailyReview } from "@/types";

interface UseDailyReviewResult {
  reviews: DailyReview[];
  currentReview: DailyReview | null;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  saveReview: (input: DailyReviewInput) => Promise<void>;
}

export function useDailyReview(userId?: string | null, date = getTodayDateKey()): UseDailyReviewResult {
  const [reviews, setReviews] = useState<DailyReview[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(READ_LIMITS.dailyReviewsPage);

  useEffect(() => {
    if (!userId) {
      setReviews([]);
      setLoading(false);
      return;
    }

    const cacheKey = `dailyReviews:${userId}:${pageSize}`;
    const cachedReviews = getClientCache<DailyReview[]>(cacheKey);

    if (cachedReviews) {
      setReviews(cachedReviews);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      return subscribeToDailyReviews(
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
    setPageSize((currentSize) => currentSize + READ_LIMITS.dailyReviewsPage);
  }, []);

  const saveReview = useCallback(
    async (input: DailyReviewInput) => {
      if (!userId) {
        throw new Error("Login is required before saving reviews.");
      }

      await saveDailyReview(userId, input);
    },
    [userId]
  );

  const currentReview = useMemo(
    () => reviews.find((review) => review.date === date) ?? null,
    [date, reviews]
  );

  return { reviews, currentReview, loading, error, hasMore: reviews.length >= pageSize, loadMore, saveReview };
}
