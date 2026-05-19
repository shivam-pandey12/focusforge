"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import { getTodayDateKey } from "@/lib/date";
import {
  addAssignment,
  deleteAssignment,
  getFirestoreErrorMessage,
  setAssignmentStatus,
  subscribeToAssignments,
  updateAssignment,
  type StudyAssignmentInput
} from "@/lib/firebase/firestore";
import type { AssignmentPriority, AssignmentStatus, StudyAssignment } from "@/types";

interface UseAssignmentsResult {
  assignments: StudyAssignment[];
  pendingAssignments: StudyAssignment[];
  overdueAssignments: StudyAssignment[];
  upcomingAssignments: StudyAssignment[];
  loading: boolean;
  error: string | null;
  createAssignment: (input: StudyAssignmentInput) => Promise<void>;
  saveAssignment: (assignmentId: string, input: StudyAssignmentInput) => Promise<void>;
  completeAssignment: (assignmentId: string) => Promise<void>;
  reopenAssignment: (assignmentId: string) => Promise<void>;
  removeAssignment: (assignmentId: string) => Promise<void>;
}

const PRIORITY_WEIGHT: Record<AssignmentPriority, number> = {
  High: 0,
  Medium: 1,
  Low: 2
};

function sortAssignments(assignments: StudyAssignment[]): StudyAssignment[] {
  return [...assignments].sort((a, b) => {
    const dateSort = a.dueDate.localeCompare(b.dueDate);

    if (dateSort !== 0) {
      return dateSort;
    }

    return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority] || a.title.localeCompare(b.title);
  });
}

function isOpenStatus(status: AssignmentStatus): boolean {
  return status !== "Completed";
}

export function useAssignments(userId?: string | null): UseAssignmentsResult {
  const [assignments, setAssignments] = useState<StudyAssignment[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    const cacheKey = `assignments:${userId}`;
    const cachedAssignments = getClientCache<StudyAssignment[]>(cacheKey);

    if (cachedAssignments) {
      setAssignments(cachedAssignments);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      return subscribeToAssignments(
        userId,
        (nextAssignments) => {
          const sorted = sortAssignments(nextAssignments);
          setClientCache(cacheKey, sorted);
          setAssignments(sorted);
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

  const pendingAssignments = useMemo(
    () => sortAssignments(assignments.filter((assignment) => isOpenStatus(assignment.status))),
    [assignments]
  );
  const overdueAssignments = useMemo(() => {
    const today = getTodayDateKey();

    return sortAssignments(
      assignments.filter((assignment) => isOpenStatus(assignment.status) && assignment.dueDate < today)
    );
  }, [assignments]);
  const upcomingAssignments = useMemo(() => {
    const today = getTodayDateKey();

    return sortAssignments(
      assignments.filter((assignment) => isOpenStatus(assignment.status) && assignment.dueDate >= today)
    );
  }, [assignments]);

  const createAssignment = useCallback(
    async (input: StudyAssignmentInput) => {
      if (!userId) {
        throw new Error("Login is required before adding homework.");
      }

      await addAssignment(userId, input);
    },
    [userId]
  );

  const saveAssignment = useCallback(async (assignmentId: string, input: StudyAssignmentInput) => {
    await updateAssignment(assignmentId, input);
  }, []);

  const completeAssignment = useCallback(async (assignmentId: string) => {
    await setAssignmentStatus(assignmentId, "Completed");
  }, []);

  const reopenAssignment = useCallback(async (assignmentId: string) => {
    await setAssignmentStatus(assignmentId, "Pending");
  }, []);

  const removeAssignment = useCallback(async (assignmentId: string) => {
    await deleteAssignment(assignmentId);
  }, []);

  return {
    assignments,
    pendingAssignments,
    overdueAssignments,
    upcomingAssignments,
    loading,
    error,
    createAssignment,
    saveAssignment,
    completeAssignment,
    reopenAssignment,
    removeAssignment
  };
}
