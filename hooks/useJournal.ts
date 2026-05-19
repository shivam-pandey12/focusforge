"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import {
  addStudyJournal,
  deleteStudyJournal,
  getFirestoreErrorMessage,
  READ_LIMITS,
  subscribeToStudyJournals,
  updateStudyJournal,
  type StudyJournalInput
} from "@/lib/firebase/firestore";
import type { StudyJournalEntry } from "@/types";

interface UseJournalResult {
  entries: StudyJournalEntry[];
  filteredEntries: StudyJournalEntry[];
  subjects: string[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  subjectFilter: string;
  setSubjectFilter: (subject: string) => void;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  createEntry: (input: StudyJournalInput) => Promise<void>;
  saveEntry: (entryId: string, input: StudyJournalInput) => Promise<void>;
  removeEntry: (entryId: string) => Promise<void>;
}

export function useJournal(userId?: string | null): UseJournalResult {
  const [entries, setEntries] = useState<StudyJournalEntry[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [pageSize, setPageSize] = useState<number>(READ_LIMITS.journalsPage);

  useEffect(() => {
    if (!userId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const cacheKey = `studyJournals:${userId}:${pageSize}`;
    const cachedEntries = getClientCache<StudyJournalEntry[]>(cacheKey);

    if (cachedEntries) {
      setEntries(cachedEntries);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      return subscribeToStudyJournals(
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

  const loadMore = useCallback(() => {
    setPageSize((currentSize) => currentSize + READ_LIMITS.journalsPage);
  }, []);

  const subjects = useMemo(
    () => [...new Set(entries.map((entry) => entry.subject).filter(Boolean) as string[])].sort(),
    [entries]
  );

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return entries.filter((entry) => {
      const matchesQuery = query
        ? [entry.title, entry.subject, entry.studiedText, entry.struggleText, entry.nextAction]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query))
        : true;
      const matchesSubject = subjectFilter ? entry.subject === subjectFilter : true;

      return matchesQuery && matchesSubject;
    });
  }, [entries, searchQuery, subjectFilter]);

  const createEntry = useCallback(
    async (input: StudyJournalInput) => {
      if (!userId) {
        throw new Error("Login is required before adding journal entries.");
      }

      await addStudyJournal(userId, input);
    },
    [userId]
  );

  const saveEntry = useCallback(async (entryId: string, input: StudyJournalInput) => {
    await updateStudyJournal(entryId, input);
  }, []);

  const removeEntry = useCallback(async (entryId: string) => {
    await deleteStudyJournal(entryId);
  }, []);

  return {
    entries,
    filteredEntries,
    subjects,
    searchQuery,
    setSearchQuery,
    subjectFilter,
    setSubjectFilter,
    loading,
    error,
    hasMore: entries.length >= pageSize,
    loadMore,
    createEntry,
    saveEntry,
    removeEntry
  };
}
