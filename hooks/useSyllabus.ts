"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addSyllabusChapter,
  addSyllabusSubject,
  addSyllabusTopic,
  deleteSyllabusChapter,
  deleteSyllabusSubject,
  deleteSyllabusTopic,
  getFirestoreErrorMessage,
  setSyllabusTopicCompleted,
  setSyllabusChapterStatus,
  setSyllabusTopicStatus,
  subscribeToSyllabusChapters,
  subscribeToSyllabusSubjects,
  subscribeToSyllabusTopics,
  updateSyllabusChapter,
  updateSyllabusSubject,
  updateSyllabusTopic
} from "@/lib/firebase/firestore";
import type { SyllabusSubjectInput } from "@/lib/firebase/firestore";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import type { SyllabusChapter, SyllabusSubject, SyllabusTopic } from "@/types";
import type { TopicStudyStatus } from "@/types";

export interface ChapterWithProgress extends SyllabusChapter {
  topics: SyllabusTopic[];
  completedTopics: number;
  totalTopics: number;
  progress: number;
}

export interface SubjectWithProgress extends SyllabusSubject {
  chapters: ChapterWithProgress[];
  completedTopics: number;
  totalTopics: number;
  progress: number;
}

interface UseSyllabusResult {
  subjects: SyllabusSubject[];
  chapters: SyllabusChapter[];
  topics: SyllabusTopic[];
  subjectsWithProgress: SubjectWithProgress[];
  overallProgress: number;
  loading: boolean;
  error: string | null;
  createSubject: (input: string | SyllabusSubjectInput) => Promise<void>;
  saveSubject: (subjectId: string, input: string | SyllabusSubjectInput) => Promise<void>;
  removeSubject: (subjectId: string) => Promise<void>;
  createChapter: (subjectId: string, name: string) => Promise<void>;
  saveChapter: (chapterId: string, name: string) => Promise<void>;
  setChapterStatus: (chapterId: string, status: TopicStudyStatus, notes?: string) => Promise<void>;
  removeChapter: (chapterId: string) => Promise<void>;
  createTopic: (subjectId: string, chapterId: string, name: string) => Promise<void>;
  saveTopic: (topicId: string, name: string) => Promise<void>;
  toggleTopic: (topicId: string, completed: boolean) => Promise<void>;
  setTopicStatus: (topicId: string, status: TopicStudyStatus, notes?: string) => Promise<void>;
  removeTopic: (topicId: string) => Promise<void>;
}

function percent(completed: number, total: number): number {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

function hasDuplicateName<T extends { id: string; name: string }>(
  items: T[],
  input: string | { name: string },
  exceptId?: string
): boolean {
  const normalized = (typeof input === "string" ? input : input.name).trim().toLowerCase();

  return items.some((item) => item.id !== exceptId && item.name.trim().toLowerCase() === normalized);
}

export function useSyllabus(userId?: string | null): UseSyllabusResult {
  const [subjects, setSubjects] = useState<SyllabusSubject[]>([]);
  const [chapters, setChapters] = useState<SyllabusChapter[]>([]);
  const [topics, setTopics] = useState<SyllabusTopic[]>([]);
  const [loadingParts, setLoadingParts] = useState({
    subjects: Boolean(userId),
    chapters: Boolean(userId),
    topics: Boolean(userId)
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setSubjects([]);
      setLoadingParts((current) => ({ ...current, subjects: false }));
      return;
    }

    const cacheKey = `syllabus:subjects:${userId}`;
    const cachedSubjects = getClientCache<SyllabusSubject[]>(cacheKey);

    if (cachedSubjects) {
      setSubjects(cachedSubjects);
      setLoadingParts((current) => ({ ...current, subjects: false }));
    } else {
      setLoadingParts((current) => ({ ...current, subjects: true }));
    }

    try {
      return subscribeToSyllabusSubjects(
        userId,
        (nextSubjects) => {
          setClientCache(cacheKey, nextSubjects);
          setSubjects(nextSubjects);
          setLoadingParts((current) => ({ ...current, subjects: false }));
          setError(null);
        },
        (message) => {
          setError(message);
          setLoadingParts((current) => ({ ...current, subjects: false }));
        }
      );
    } catch (currentError) {
      setError(getFirestoreErrorMessage(currentError));
      setLoadingParts((current) => ({ ...current, subjects: false }));
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setChapters([]);
      setLoadingParts((current) => ({ ...current, chapters: false }));
      return;
    }

    const cacheKey = `syllabus:chapters:${userId}`;
    const cachedChapters = getClientCache<SyllabusChapter[]>(cacheKey);

    if (cachedChapters) {
      setChapters(cachedChapters);
      setLoadingParts((current) => ({ ...current, chapters: false }));
    } else {
      setLoadingParts((current) => ({ ...current, chapters: true }));
    }

    try {
      return subscribeToSyllabusChapters(
        userId,
        (nextChapters) => {
          setClientCache(cacheKey, nextChapters);
          setChapters(nextChapters);
          setLoadingParts((current) => ({ ...current, chapters: false }));
          setError(null);
        },
        (message) => {
          setError(message);
          setLoadingParts((current) => ({ ...current, chapters: false }));
        }
      );
    } catch (currentError) {
      setError(getFirestoreErrorMessage(currentError));
      setLoadingParts((current) => ({ ...current, chapters: false }));
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setTopics([]);
      setLoadingParts((current) => ({ ...current, topics: false }));
      return;
    }

    const cacheKey = `syllabus:topics:${userId}`;
    const cachedTopics = getClientCache<SyllabusTopic[]>(cacheKey);

    if (cachedTopics) {
      setTopics(cachedTopics);
      setLoadingParts((current) => ({ ...current, topics: false }));
    } else {
      setLoadingParts((current) => ({ ...current, topics: true }));
    }

    try {
      return subscribeToSyllabusTopics(
        userId,
        (nextTopics) => {
          setClientCache(cacheKey, nextTopics);
          setTopics(nextTopics);
          setLoadingParts((current) => ({ ...current, topics: false }));
          setError(null);
        },
        (message) => {
          setError(message);
          setLoadingParts((current) => ({ ...current, topics: false }));
        }
      );
    } catch (currentError) {
      setError(getFirestoreErrorMessage(currentError));
      setLoadingParts((current) => ({ ...current, topics: false }));
    }
  }, [userId]);

  const subjectsWithProgress = useMemo<SubjectWithProgress[]>(() => {
    return subjects.map((subject) => {
      const subjectChapters = chapters
        .filter((chapter) => chapter.subjectId === subject.id)
        .map<ChapterWithProgress>((chapter) => {
          const chapterTopics = topics.filter((topic) => topic.chapterId === chapter.id);
          const completedTopics = chapterTopics.filter((topic) => topic.completed).length;

          return {
            ...chapter,
            topics: chapterTopics,
            completedTopics,
            totalTopics: chapterTopics.length,
            progress: percent(completedTopics, chapterTopics.length)
          };
        });
      const totalTopics = subjectChapters.reduce((total, chapter) => total + chapter.totalTopics, 0);
      const completedTopics = subjectChapters.reduce((total, chapter) => total + chapter.completedTopics, 0);

      return {
        ...subject,
        chapters: subjectChapters,
        completedTopics,
        totalTopics,
        progress: percent(completedTopics, totalTopics)
      };
    });
  }, [chapters, subjects, topics]);

  const overallProgress = useMemo(() => {
    const completedTopics = topics.filter((topic) => topic.completed).length;

    return percent(completedTopics, topics.length);
  }, [topics]);

  const createSubject = useCallback(
    async (input: string | SyllabusSubjectInput) => {
      if (!userId) {
        throw new Error("Login is required before creating subjects.");
      }

      if (hasDuplicateName(subjects, input)) {
        throw new Error("A subject with this name already exists.");
      }

      await addSyllabusSubject(userId, input);
    },
    [subjects, userId]
  );

  const saveSubject = useCallback(
    async (subjectId: string, input: string | SyllabusSubjectInput) => {
      if (hasDuplicateName(subjects, input, subjectId)) {
        throw new Error("A subject with this name already exists.");
      }

      await updateSyllabusSubject(subjectId, input);
    },
    [subjects]
  );

  const removeSubject = useCallback(
    async (subjectId: string) => {
      if (!userId) {
        throw new Error("Login is required before deleting subjects.");
      }

      await deleteSyllabusSubject(userId, subjectId);
    },
    [userId]
  );

  const createChapter = useCallback(
    async (subjectId: string, name: string) => {
      if (!userId) {
        throw new Error("Login is required before creating chapters.");
      }

      if (hasDuplicateName(chapters.filter((chapter) => chapter.subjectId === subjectId), name)) {
        throw new Error("This subject already has a chapter with that name.");
      }

      await addSyllabusChapter(userId, subjectId, name);
    },
    [chapters, userId]
  );

  const saveChapter = useCallback(
    async (chapterId: string, name: string) => {
      const chapter = chapters.find((item) => item.id === chapterId);

      if (
        chapter &&
        hasDuplicateName(
          chapters.filter((item) => item.subjectId === chapter.subjectId),
          name,
          chapterId
        )
      ) {
        throw new Error("This subject already has a chapter with that name.");
      }

      await updateSyllabusChapter(chapterId, name);
    },
    [chapters]
  );

  const removeChapter = useCallback(
    async (chapterId: string) => {
      if (!userId) {
        throw new Error("Login is required before deleting chapters.");
      }

      await deleteSyllabusChapter(userId, chapterId);
    },
    [userId]
  );

  const setChapterStatus = useCallback(async (chapterId: string, status: TopicStudyStatus, notes = "") => {
    await setSyllabusChapterStatus(chapterId, status, notes);
  }, []);

  const createTopic = useCallback(
    async (subjectId: string, chapterId: string, name: string) => {
      if (!userId) {
        throw new Error("Login is required before creating topics.");
      }

      if (hasDuplicateName(topics.filter((topic) => topic.chapterId === chapterId), name)) {
        throw new Error("This chapter already has a topic with that name.");
      }

      await addSyllabusTopic(userId, subjectId, chapterId, name);
    },
    [topics, userId]
  );

  const saveTopic = useCallback(
    async (topicId: string, name: string) => {
      const topic = topics.find((item) => item.id === topicId);

      if (
        topic &&
        hasDuplicateName(
          topics.filter((item) => item.chapterId === topic.chapterId),
          name,
          topicId
        )
      ) {
        throw new Error("This chapter already has a topic with that name.");
      }

      await updateSyllabusTopic(topicId, name);
    },
    [topics]
  );

  const toggleTopic = useCallback(async (topicId: string, completed: boolean) => {
    await setSyllabusTopicCompleted(topicId, completed);
  }, []);

  const setTopicStatus = useCallback(async (topicId: string, status: TopicStudyStatus, notes = "") => {
    await setSyllabusTopicStatus(topicId, status, notes);
  }, []);

  const removeTopic = useCallback(async (topicId: string) => {
    await deleteSyllabusTopic(topicId);
  }, []);

  return {
    subjects,
    chapters,
    topics,
    subjectsWithProgress,
    overallProgress,
    loading: Object.values(loadingParts).some(Boolean),
    error,
    createSubject,
    saveSubject,
    removeSubject,
    createChapter,
    saveChapter,
    setChapterStatus,
    removeChapter,
    createTopic,
    saveTopic,
    toggleTopic,
    setTopicStatus,
    removeTopic
  };
}
