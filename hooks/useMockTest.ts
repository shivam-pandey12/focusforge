"use client";

import { useEffect, useState } from "react";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import { fetchMockTestById, getFirestoreErrorMessage } from "@/lib/firebase/firestore";
import type { MockTestResult } from "@/types";

interface UseMockTestResult {
  test: MockTestResult | null;
  loading: boolean;
  error: string | null;
}

export function useMockTest(userId?: string | null, testId?: string | null): UseMockTestResult {
  const [test, setTest] = useState<MockTestResult | null>(null);
  const [loading, setLoading] = useState(Boolean(userId && testId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !testId) {
      setTest(null);
      setLoading(false);
      return;
    }

    const cacheKey = `mockTest:${userId}:${testId}`;
    const cached = getClientCache<MockTestResult>(cacheKey);
    let cancelled = false;

    if (cached) {
      setTest(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    fetchMockTestById(userId, testId)
      .then((nextTest) => {
        if (cancelled) {
          return;
        }

        if (nextTest) {
          setClientCache(cacheKey, nextTest);
        }

        setTest(nextTest);
        setLoading(false);
        setError(null);
      })
      .catch((currentError) => {
        if (!cancelled) {
          setError(getFirestoreErrorMessage(currentError));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [testId, userId]);

  return { test, loading, error };
}
