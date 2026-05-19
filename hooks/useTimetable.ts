"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addScheduleProfile,
  addTimetableBlock,
  deleteScheduleProfile,
  deleteTimetableBlock,
  getFirestoreErrorMessage,
  setActiveScheduleProfile,
  subscribeToScheduleProfiles,
  subscribeToTimetableBlocks,
  updateScheduleProfile,
  updateTimetableBlock,
  type ScheduleProfileInput,
  type TimetableBlockInput
} from "@/lib/firebase/firestore";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import { getTodayDateKey } from "@/lib/date";
import {
  getNextTimetableBlock,
  getTimetableConflicts,
  getTimetableScheduleContext,
  normalizeCycleDay,
  normalizeCycleLength,
  normalizeTimetableScheduleMode,
  normalizeTimetableWeekGroup,
  resolveActiveCycleBlocks,
  resolveTimetableBlocksForDate,
  type TimetableBlockDraft,
  type TimetableConflict,
  type TimetableScheduleContext
} from "@/lib/timetable";
import type { ScheduleProfile, TimetableBlock } from "@/types";

interface UseTimetableResult {
  blocks: TimetableBlock[];
  profiles: ScheduleProfile[];
  activeProfile: ScheduleProfile;
  scheduleContext: TimetableScheduleContext;
  activeDayBlocks: TimetableBlock[];
  todayBlocks: TimetableBlock[];
  nextBlock: TimetableBlock | null;
  loading: boolean;
  error: string | null;
  createBlock: (input: TimetableBlockInput) => Promise<void>;
  saveBlock: (blockId: string, input: TimetableBlockInput) => Promise<void>;
  removeBlock: (blockId: string) => Promise<void>;
  createProfile: (input: ScheduleProfileInput) => Promise<void>;
  saveProfile: (profileId: string, input: ScheduleProfileInput) => Promise<void>;
  removeProfile: (profileId: string) => Promise<void>;
  activateProfile: (profileId: string) => Promise<void>;
  getBlocksForDate: (dateKey: string) => TimetableBlock[];
  getAllBlocksForDate: (dateKey: string) => TimetableBlock[];
  getConflictsForInput: (input: TimetableBlockInput, exceptId?: string) => TimetableConflict[];
  getConflictsForBlock: (block: TimetableBlock) => TimetableConflict[];
}

export function useTimetable(userId?: string | null): UseTimetableResult {
  const [blocks, setBlocks] = useState<TimetableBlock[]>([]);
  const [profiles, setProfiles] = useState<ScheduleProfile[]>([]);
  const [loadingParts, setLoadingParts] = useState({ blocks: Boolean(userId), profiles: Boolean(userId) });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setBlocks([]);
      setLoadingParts((current) => ({ ...current, blocks: false }));
      return;
    }

    const cacheKey = `timetable:${userId}`;
    const cachedBlocks = getClientCache<TimetableBlock[]>(cacheKey);

    if (cachedBlocks) {
      setBlocks(cachedBlocks);
      setLoadingParts((current) => ({ ...current, blocks: false }));
    } else {
      setLoadingParts((current) => ({ ...current, blocks: true }));
    }

    try {
      return subscribeToTimetableBlocks(
        userId,
        (nextBlocks) => {
          setClientCache(cacheKey, nextBlocks);
          setBlocks(nextBlocks);
          setLoadingParts((current) => ({ ...current, blocks: false }));
          setError(null);
        },
        (message) => {
          setError(message);
          setLoadingParts((current) => ({ ...current, blocks: false }));
        }
      );
    } catch (currentError) {
      setError(getFirestoreErrorMessage(currentError));
      setLoadingParts((current) => ({ ...current, blocks: false }));
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setProfiles([]);
      setLoadingParts((current) => ({ ...current, profiles: false }));
      return;
    }

    const cacheKey = `scheduleProfiles:${userId}`;
    const cachedProfiles = getClientCache<ScheduleProfile[]>(cacheKey);

    if (cachedProfiles) {
      setProfiles(cachedProfiles);
      setLoadingParts((current) => ({ ...current, profiles: false }));
    } else {
      setLoadingParts((current) => ({ ...current, profiles: true }));
    }

    try {
      return subscribeToScheduleProfiles(
        userId,
        (nextProfiles) => {
          setClientCache(cacheKey, nextProfiles);
          setProfiles(nextProfiles);
          setLoadingParts((current) => ({ ...current, profiles: false }));
          setError(null);
        },
        (message) => {
          setError(message);
          setLoadingParts((current) => ({ ...current, profiles: false }));
        }
      );
    } catch (currentError) {
      setError(getFirestoreErrorMessage(currentError));
      setLoadingParts((current) => ({ ...current, profiles: false }));
    }
  }, [userId]);

  const scheduleContext = useMemo(() => getTimetableScheduleContext(profiles, userId ?? ""), [profiles, userId]);

  const getBlocksForDate = useCallback(
    (dateKey: string) => resolveTimetableBlocksForDate(blocks, dateKey, scheduleContext),
    [blocks, scheduleContext]
  );

  const getAllBlocksForDate = useCallback(
    (dateKey: string) => resolveTimetableBlocksForDate(blocks, dateKey, scheduleContext, { includeAllProfiles: true, includeAllAlternateWeeks: true }),
    [blocks, scheduleContext]
  );

  const todayBlocks = useMemo(() => getBlocksForDate(getTodayDateKey()), [getBlocksForDate]);
  const activeDayBlocks = useMemo(
    () => scheduleContext.scheduleMode === "dayCycle" ? resolveActiveCycleBlocks(blocks, scheduleContext) : todayBlocks,
    [blocks, scheduleContext, todayBlocks]
  );

  const nextBlock = useMemo(() => getNextTimetableBlock(blocks, scheduleContext), [blocks, scheduleContext]);

  const getConflictsForInput = useCallback(
    (input: TimetableBlockInput, exceptId?: string) => {
      const scheduleMode = normalizeTimetableScheduleMode(input.scheduleMode);
      const cycleLength = normalizeCycleLength(input.cycleLength);
      const draft: TimetableBlockDraft = {
        ...input,
        id: exceptId ?? "__draft__",
        title: input.title ?? input.subject,
        subject: input.subject,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        isRecurring: input.isRecurring,
        scheduleMode,
        weekGroup: normalizeTimetableWeekGroup(input.weekGroup),
        cycleLength: scheduleMode === "dayCycle" ? cycleLength : null,
        cycleDayNumber: scheduleMode === "dayCycle" ? normalizeCycleDay(input.cycleDayNumber, cycleLength) : null
      };

      return getTimetableConflicts(draft, blocks, exceptId);
    },
    [blocks]
  );

  const getConflictsForBlock = useCallback((block: TimetableBlock) => getTimetableConflicts(block, blocks, block.id), [blocks]);

  const createBlock = useCallback(
    async (input: TimetableBlockInput) => {
      if (!userId) {
        throw new Error("Login is required before creating timetable blocks.");
      }

      await addTimetableBlock(userId, input);
    },
    [userId]
  );

  const saveBlock = useCallback(async (blockId: string, input: TimetableBlockInput) => {
    await updateTimetableBlock(blockId, input);
  }, []);

  const removeBlock = useCallback(async (blockId: string) => {
    await deleteTimetableBlock(blockId);
  }, []);

  const createProfile = useCallback(
    async (input: ScheduleProfileInput) => {
      if (!userId) {
        throw new Error("Login is required before creating schedule profiles.");
      }

      await addScheduleProfile(userId, input);
    },
    [userId]
  );

  const saveProfile = useCallback(async (profileId: string, input: ScheduleProfileInput) => {
    await updateScheduleProfile(profileId, input);
  }, []);

  const removeProfile = useCallback(
    async (profileId: string) => {
      if (!userId) {
        throw new Error("Login is required before deleting schedule profiles.");
      }

      await deleteScheduleProfile(userId, profileId);
    },
    [userId]
  );

  const activateProfile = useCallback(
    async (profileId: string) => {
      if (!userId) {
        throw new Error("Login is required before activating schedule profiles.");
      }

      await setActiveScheduleProfile(userId, profileId);
    },
    [userId]
  );

  return {
    blocks,
    profiles,
    activeProfile: scheduleContext.activeProfile,
    scheduleContext,
    activeDayBlocks,
    todayBlocks,
    nextBlock,
    loading: loadingParts.blocks || loadingParts.profiles,
    error,
    createBlock,
    saveBlock,
    removeBlock,
    createProfile,
    saveProfile,
    removeProfile,
    activateProfile,
    getBlocksForDate,
    getAllBlocksForDate,
    getConflictsForInput,
    getConflictsForBlock
  };
}
