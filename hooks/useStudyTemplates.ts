"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import { addDays, getDateKey } from "@/lib/date";
import {
  addRevisionPlan,
  addStudyHabit,
  addStudyTask,
  addStudyTemplate,
  addTimetableBlock,
  deleteStudyTemplate,
  getFirestoreErrorMessage,
  subscribeToStudyTemplates,
  updateStudyTemplate,
  type StudyTemplateInput
} from "@/lib/firebase/firestore";
import { SYSTEM_STUDY_TEMPLATES } from "@/lib/templates";
import type { StudyTemplate } from "@/types";

interface UseStudyTemplatesResult {
  systemTemplates: StudyTemplate[];
  customTemplates: StudyTemplate[];
  templates: StudyTemplate[];
  loading: boolean;
  error: string | null;
  createTemplate: (input: StudyTemplateInput) => Promise<void>;
  saveTemplate: (templateId: string, input: StudyTemplateInput) => Promise<void>;
  removeTemplate: (templateId: string) => Promise<void>;
  applyTemplate: (template: StudyTemplate) => Promise<number>;
}

function countTemplateItems(template: StudyTemplate): number {
  return (
    (template.config.tasks?.length ?? 0) +
    (template.config.timetableBlocks?.length ?? 0) +
    (template.config.revisions?.length ?? 0) +
    (template.config.habits?.length ?? 0)
  );
}

export function useStudyTemplates(userId?: string | null): UseStudyTemplatesResult {
  const [customTemplates, setCustomTemplates] = useState<StudyTemplate[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setCustomTemplates([]);
      setLoading(false);
      return;
    }

    const cacheKey = `studyTemplates:${userId}`;
    const cachedTemplates = getClientCache<StudyTemplate[]>(cacheKey);

    if (cachedTemplates) {
      setCustomTemplates(cachedTemplates);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      return subscribeToStudyTemplates(
        userId,
        (nextTemplates) => {
          setClientCache(cacheKey, nextTemplates);
          setCustomTemplates(nextTemplates);
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

  const createTemplate = useCallback(
    async (input: StudyTemplateInput) => {
      if (!userId) {
        throw new Error("Login is required before creating templates.");
      }

      await addStudyTemplate(userId, input);
    },
    [userId]
  );

  const saveTemplate = useCallback(async (templateId: string, input: StudyTemplateInput) => {
    await updateStudyTemplate(templateId, input);
  }, []);

  const removeTemplate = useCallback(async (templateId: string) => {
    await deleteStudyTemplate(templateId);
  }, []);

  const applyTemplate = useCallback(
    async (template: StudyTemplate) => {
      if (!userId) {
        throw new Error("Login is required before applying templates.");
      }

      let created = 0;

      for (const task of template.config.tasks ?? []) {
        await addStudyTask(userId, task.title, task.duration ?? 25, task.subject);
        created += 1;
      }

      for (const block of template.config.timetableBlocks ?? []) {
        await addTimetableBlock(userId, {
          ...block,
          notes: block.notes ?? "",
          isRecurring: true
        });
        created += 1;
      }

      for (const revision of template.config.revisions ?? []) {
        await addRevisionPlan(userId, {
          title: revision.title,
          subject: revision.subject,
          notes: revision.notes ?? "",
          nextRevisionDate: revision.nextRevisionDate ?? getDateKey(addDays(new Date(), 1))
        });
        created += 1;
      }

      for (const habit of template.config.habits ?? []) {
        await addStudyHabit(userId, habit);
        created += 1;
      }

      return created || countTemplateItems(template);
    },
    [userId]
  );

  const templates = useMemo(() => [...SYSTEM_STUDY_TEMPLATES, ...customTemplates], [customTemplates]);

  return {
    systemTemplates: SYSTEM_STUDY_TEMPLATES,
    customTemplates,
    templates,
    loading,
    error,
    createTemplate,
    saveTemplate,
    removeTemplate,
    applyTemplate
  };
}
