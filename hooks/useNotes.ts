"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addStudyNote,
  deleteStudyNote,
  getFirestoreErrorMessage,
  READ_LIMITS,
  subscribeToNotes,
  updateStudyNote,
  type StudyNoteInput
} from "@/lib/firebase/firestore";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import type { StudyNote } from "@/types";

interface UseNotesResult {
  notes: StudyNote[];
  filteredNotes: StudyNote[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  createNote: (input: StudyNoteInput) => Promise<string>;
  saveNote: (noteId: string, input: StudyNoteInput) => Promise<void>;
  removeNote: (noteId: string) => Promise<void>;
}

export function useNotes(userId?: string | null): UseNotesResult {
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState<number>(READ_LIMITS.notesPage);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setNotes([]);
      setLoading(false);
      return;
    }

    const cacheKey = `notes:${userId}:${pageSize}`;
    const cachedNotes = getClientCache<StudyNote[]>(cacheKey);

    if (cachedNotes) {
      setNotes(cachedNotes);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      return subscribeToNotes(
        userId,
        (nextNotes) => {
          setClientCache(cacheKey, nextNotes);
          setNotes(nextNotes);
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
    setPageSize((currentSize) => currentSize + READ_LIMITS.notesPageStep);
  }, []);

  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return notes;
    }

    return notes.filter((note) =>
      [note.title, note.content, note.subject, note.linkedTaskTitle]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [notes, searchQuery]);

  const createNote = useCallback(
    async (input: StudyNoteInput) => {
      if (!userId) {
        throw new Error("Login is required before creating notes.");
      }

      return addStudyNote(userId, input);
    },
    [userId]
  );

  const saveNote = useCallback(async (noteId: string, input: StudyNoteInput) => {
    await updateStudyNote(noteId, input);
  }, []);

  const removeNote = useCallback(async (noteId: string) => {
    await deleteStudyNote(noteId);
  }, []);

  return {
    notes,
    filteredNotes,
    searchQuery,
    setSearchQuery,
    loading,
    error,
    hasMore: notes.length >= pageSize,
    loadMore,
    createNote,
    saveNote,
    removeNote
  };
}
