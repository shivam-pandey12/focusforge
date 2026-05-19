"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import { getMonthDateRange, getWeekDateRange } from "@/lib/date";
import { summarizeMarksEntries, type MarksProgressSummary } from "@/lib/marks";
import {
  addMarksEntry,
  deleteMarksEntry,
  getFirestoreErrorMessage,
  READ_LIMITS,
  subscribeToMarksEntries,
  updateMarksEntry,
  type MarksEntryInput
} from "@/lib/firebase/firestore";
import type { MarksEntry, MarksEntryScope, SyllabusSubject } from "@/types";

export type MarksDateRangeFilter = "all" | "week" | "month";

interface UseMarksEntriesOptions {
  subjects?: SyllabusSubject[];
}

interface UseMarksEntriesResult {
  entries: MarksEntry[];
  filteredEntries: MarksEntry[];
  summary: MarksProgressSummary;
  subjectFilter: string;
  setSubjectFilter: (subjectId: string) => void;
  scopeFilter: "" | MarksEntryScope;
  setScopeFilter: (scope: "" | MarksEntryScope) => void;
  dateRangeFilter: MarksDateRangeFilter;
  setDateRangeFilter: (range: MarksDateRangeFilter) => void;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  resetFilters: () => void;
  createEntry: (input: MarksEntryInput) => Promise<void>;
  saveEntry: (entryId: string, input: MarksEntryInput) => Promise<void>;
  removeEntry: (entryId: string) => Promise<void>;
}

function isInDateRange(dateKey: string, range: MarksDateRangeFilter): boolean {
  if (range === "all") {
    return true;
  }

  const bounds = range === "week" ? getWeekDateRange() : getMonthDateRange();

  return dateKey >= bounds.start && dateKey <= bounds.end;
}

export function useMarksEntries(
  userId?: string | null,
  options: UseMarksEntriesOptions = {}
): UseMarksEntriesResult {
  const [entries, setEntries] = useState<MarksEntry[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"" | MarksEntryScope>("");
  const [dateRangeFilter, setDateRangeFilter] = useState<MarksDateRangeFilter>("all");
  const [pageSize, setPageSize] = useState<number>(READ_LIMITS.marksEntriesPage);

  useEffect(() => {
    if (!userId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const cacheKey = `marksEntries:${userId}:${pageSize}`;
    const cachedEntries = getClientCache<MarksEntry[]>(cacheKey);

    if (cachedEntries) {
      setEntries(cachedEntries);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      return subscribeToMarksEntries(
        userId,
        (nextEntries) => {
          setClientCache(cacheKey, nextEntries);
          setEntries(nextEntries);
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

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSubject = subjectFilter ? entry.subjectId === subjectFilter : true;
      const matchesScope = scopeFilter ? entry.scope === scopeFilter : true;
      const matchesDateRange = isInDateRange(entry.date, dateRangeFilter);

      return matchesSubject && matchesScope && matchesDateRange;
    });
  }, [dateRangeFilter, entries, scopeFilter, subjectFilter]);

  const summary = useMemo(
    () => summarizeMarksEntries(entries, options.subjects ?? []),
    [entries, options.subjects]
  );

  const loadMore = useCallback(() => {
    setPageSize((currentSize) => currentSize + READ_LIMITS.marksEntriesPage);
  }, []);

  const resetFilters = useCallback(() => {
    setSubjectFilter("");
    setScopeFilter("");
    setDateRangeFilter("all");
  }, []);

  const createEntry = useCallback(
    async (input: MarksEntryInput) => {
      if (!userId) {
        throw new Error("Login is required before adding marks.");
      }

      await addMarksEntry(userId, input);
    },
    [userId]
  );

  const saveEntry = useCallback(async (entryId: string, input: MarksEntryInput) => {
    await updateMarksEntry(entryId, input);
  }, []);

  const removeEntry = useCallback(async (entryId: string) => {
    await deleteMarksEntry(entryId);
  }, []);

  return {
    entries,
    filteredEntries,
    summary,
    subjectFilter,
    setSubjectFilter,
    scopeFilter,
    setScopeFilter,
    dateRangeFilter,
    setDateRangeFilter,
    loading,
    error,
    hasMore: entries.length >= pageSize,
    loadMore,
    resetFilters,
    createEntry,
    saveEntry,
    removeEntry
  };
}
