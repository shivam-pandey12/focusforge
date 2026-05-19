"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchPayments, getFirestoreErrorMessage, READ_LIMITS } from "@/lib/firebase/firestore";
import type { PaymentRecord } from "@/types";

export function usePayments(userId?: string | null) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(READ_LIMITS.paymentsPage);

  useEffect(() => {
    if (!userId) {
      setPayments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    let cancelled = false;

    fetchPayments(userId, pageSize)
      .then((nextPayments) => {
        if (!cancelled) {
          setPayments(nextPayments);
          setLoading(false);
          setError(null);
        }
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
  }, [pageSize, userId]);

  const refreshPayments = useCallback(async () => {
    if (!userId) {
      return;
    }

    const nextPayments = await fetchPayments(userId, pageSize);
    setPayments(nextPayments);
  }, [pageSize, userId]);

  const loadMore = useCallback(() => {
    setPageSize((currentSize) => currentSize + READ_LIMITS.paymentsPage);
  }, []);

  return { payments, loading, error, hasMore: payments.length >= pageSize, loadMore, refreshPayments };
}
