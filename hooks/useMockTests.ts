"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import {
  addMockTest,
  deleteMockTest,
  getFirestoreErrorMessage,
  READ_LIMITS,
  subscribeToMockTests,
  updateMockTest,
  type MockTestInput
} from "@/lib/firebase/firestore";
import { calculateMockAnalytics, getMockWeakAreas, type MockAnalyticsSummary } from "@/lib/mockAnalytics";
import { addDays, getDateKey, getTodayDateKey, parseDateKey } from "@/lib/date";
import type { MockTestResult } from "@/types";

export type MockDateRangeFilter = "all" | "week" | "month";
export type MockWeaknessFilter = "all" | "weak";
export type MockSortMode = "newest" | "lowest" | "highest";

interface UseMockTestsResult {
  tests: MockTestResult[];
  filteredTests: MockTestResult[];
  summary: MockAnalyticsSummary;
  subjects: string[];
  examTypes: string[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  subjectFilter: string;
  setSubjectFilter: (subject: string) => void;
  examTypeFilter: string;
  setExamTypeFilter: (examType: string) => void;
  dateRangeFilter: MockDateRangeFilter;
  setDateRangeFilter: (range: MockDateRangeFilter) => void;
  weaknessFilter: MockWeaknessFilter;
  setWeaknessFilter: (filter: MockWeaknessFilter) => void;
  sortMode: MockSortMode;
  setSortMode: (sortMode: MockSortMode) => void;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  createTest: (input: MockTestInput) => Promise<void>;
  saveTest: (testId: string, input: MockTestInput) => Promise<void>;
  removeTest: (testId: string) => Promise<void>;
}

export function useMockTests(userId?: string | null): UseMockTestsResult {
  const [tests, setTests] = useState<MockTestResult[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [examTypeFilter, setExamTypeFilter] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState<MockDateRangeFilter>("all");
  const [weaknessFilter, setWeaknessFilter] = useState<MockWeaknessFilter>("all");
  const [sortMode, setSortMode] = useState<MockSortMode>("newest");
  const [pageSize, setPageSize] = useState<number>(READ_LIMITS.mockTestsPage);

  useEffect(() => {
    if (!userId) {
      setTests([]);
      setLoading(false);
      return;
    }

    const cacheKey = `mockTests:${userId}:${pageSize}`;
    const cachedTests = getClientCache<MockTestResult[]>(cacheKey);

    if (cachedTests) {
      setTests(cachedTests);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      return subscribeToMockTests(
        userId,
        (nextTests) => {
          setClientCache(cacheKey, nextTests);
          setTests(nextTests);
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
    setPageSize((currentSize) => currentSize + READ_LIMITS.mockTestsPage);
  }, []);

  const summary = useMemo(() => calculateMockAnalytics(tests), [tests]);
  const subjects = useMemo(() => {
    const names = tests.flatMap((test) => [
      test.subject,
      ...test.subjectBreakdowns.map((row) => row.subject),
      ...test.topicAnalyses.map((row) => row.subject)
    ]);

    return [...new Set(names.filter(Boolean) as string[])].sort();
  }, [tests]);
  const examTypes = useMemo(
    () => [...new Set(tests.map((test) => test.examType).filter(Boolean) as string[])].sort(),
    [tests]
  );

  const filteredTests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const today = getTodayDateKey();
    const cutoff = dateRangeFilter === "week"
      ? getDateKey(addDays(parseDateKey(today), -7))
      : dateRangeFilter === "month"
        ? getDateKey(addDays(parseDateKey(today), -30))
        : "";

    return tests.filter((test) => {
      const matchesQuery = query
        ? [
          test.title,
          test.subject,
          test.examType,
          test.notes,
          ...test.subjectBreakdowns.map((row) => row.subject),
          ...test.topicAnalyses.flatMap((row) => [row.subject, row.chapterName, row.topicName, row.notes, ...row.mistakeTags])
        ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query))
        : true;
      const subjectNames = [
        test.subject,
        ...test.subjectBreakdowns.map((row) => row.subject),
        ...test.topicAnalyses.map((row) => row.subject)
      ];
      const matchesSubject = subjectFilter ? subjectNames.includes(subjectFilter) : true;
      const matchesExamType = examTypeFilter ? test.examType === examTypeFilter : true;
      const matchesDate = cutoff ? test.testDate >= cutoff : true;
      const matchesWeakness = weaknessFilter === "weak" ? getMockWeakAreas(test).length > 0 : true;

      return matchesQuery && matchesSubject && matchesExamType && matchesDate && matchesWeakness;
    }).sort((a, b) => {
      if (sortMode === "lowest") {
        return a.percentage - b.percentage || b.testDate.localeCompare(a.testDate);
      }

      if (sortMode === "highest") {
        return b.percentage - a.percentage || b.testDate.localeCompare(a.testDate);
      }

      return b.testDate.localeCompare(a.testDate) || a.title.localeCompare(b.title);
    });
  }, [dateRangeFilter, examTypeFilter, searchQuery, sortMode, subjectFilter, tests, weaknessFilter]);

  const createTest = useCallback(
    async (input: MockTestInput) => {
      if (!userId) {
        throw new Error("Login is required before adding mock tests.");
      }

      await addMockTest(userId, input);
    },
    [userId]
  );

  const saveTest = useCallback(async (testId: string, input: MockTestInput) => {
    await updateMockTest(testId, input);
  }, []);

  const removeTest = useCallback(async (testId: string) => {
    await deleteMockTest(testId);
  }, []);

  return {
    tests,
    filteredTests,
    summary,
    subjects,
    examTypes,
    searchQuery,
    setSearchQuery,
    subjectFilter,
    setSubjectFilter,
    examTypeFilter,
    setExamTypeFilter,
    dateRangeFilter,
    setDateRangeFilter,
    weaknessFilter,
    setWeaknessFilter,
    sortMode,
    setSortMode,
    loading,
    error,
    hasMore: tests.length >= pageSize,
    loadMore,
    createTest,
    saveTest,
    removeTest
  };
}
