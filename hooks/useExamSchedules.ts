"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import { getTodayDateKey } from "@/lib/date";
import {
  addExamSchedule,
  deleteExamSchedule,
  getFirestoreErrorMessage,
  subscribeToExamSchedules,
  updateExamSchedule,
  type ExamScheduleInput
} from "@/lib/firebase/firestore";
import type { ExamSchedule } from "@/types";

interface UseExamSchedulesResult {
  exams: ExamSchedule[];
  upcomingExams: ExamSchedule[];
  pastExams: ExamSchedule[];
  nearestExam: ExamSchedule | null;
  loading: boolean;
  error: string | null;
  createExam: (input: ExamScheduleInput) => Promise<void>;
  saveExam: (examId: string, input: ExamScheduleInput) => Promise<void>;
  removeExam: (examId: string) => Promise<void>;
}

function sortExams(exams: ExamSchedule[]): ExamSchedule[] {
  return [...exams].sort((a, b) => {
    const dateSort = a.date.localeCompare(b.date);

    if (dateSort !== 0) {
      return dateSort;
    }

    return String(a.startTime ?? "").localeCompare(String(b.startTime ?? "")) || a.name.localeCompare(b.name);
  });
}

export function useExamSchedules(userId?: string | null): UseExamSchedulesResult {
  const [exams, setExams] = useState<ExamSchedule[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setExams([]);
      setLoading(false);
      return;
    }

    const cacheKey = `examSchedules:${userId}`;
    const cachedExams = getClientCache<ExamSchedule[]>(cacheKey);

    if (cachedExams) {
      setExams(cachedExams);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      return subscribeToExamSchedules(
        userId,
        (nextExams) => {
          const sorted = sortExams(nextExams);
          setClientCache(cacheKey, sorted);
          setExams(sorted);
          setLoading(false);
          setError(null);
        },
        (message) => {
          setError(message);
          setLoading(false);
        }
      );
    } catch (currentError) {
      setError(getFirestoreErrorMessage(currentError));
      setLoading(false);
    }
  }, [userId]);

  const upcomingExams = useMemo(() => {
    const today = getTodayDateKey();

    return sortExams(exams.filter((exam) => exam.date >= today));
  }, [exams]);
  const pastExams = useMemo(() => {
    const today = getTodayDateKey();

    return sortExams(exams.filter((exam) => exam.date < today)).reverse();
  }, [exams]);
  const nearestExam = upcomingExams[0] ?? null;

  const createExam = useCallback(
    async (input: ExamScheduleInput) => {
      if (!userId) {
        throw new Error("Login is required before adding exams.");
      }

      await addExamSchedule(userId, input);
    },
    [userId]
  );

  const saveExam = useCallback(async (examId: string, input: ExamScheduleInput) => {
    await updateExamSchedule(examId, input);
  }, []);

  const removeExam = useCallback(async (examId: string) => {
    await deleteExamSchedule(examId);
  }, []);

  return {
    exams,
    upcomingExams,
    pastExams,
    nearestExam,
    loading,
    error,
    createExam,
    saveExam,
    removeExam
  };
}
