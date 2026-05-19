"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import { getDateKey, getTodayDateKey, getWeekDateRange } from "@/lib/date";
import {
  addBacklogItem,
  deleteBacklogItem,
  getFirestoreErrorMessage,
  READ_LIMITS,
  setBacklogItemStatus,
  subscribeToBacklogItems,
  updateBacklogItem,
  type BacklogItemInput
} from "@/lib/firebase/firestore";
import type { AssignmentPriority, BacklogItem, BacklogLevel, BacklogStatus } from "@/types";

export type BacklogSubjectFilter = string;
export type BacklogStatusFilter = "all" | BacklogStatus;
export type BacklogLevelFilter = "all" | BacklogLevel;
export type BacklogPriorityFilter = "all" | AssignmentPriority;

interface UseBacklogItemsResult {
  items: BacklogItem[];
  activeItems: BacklogItem[];
  clearedItems: BacklogItem[];
  filteredItems: BacklogItem[];
  heavyCount: number;
  clearedThisWeek: number;
  overdueTargetCount: number;
  subjectFilter: BacklogSubjectFilter;
  setSubjectFilter: (subjectId: string) => void;
  statusFilter: BacklogStatusFilter;
  setStatusFilter: (status: BacklogStatusFilter) => void;
  levelFilter: BacklogLevelFilter;
  setLevelFilter: (level: BacklogLevelFilter) => void;
  priorityFilter: BacklogPriorityFilter;
  setPriorityFilter: (priority: BacklogPriorityFilter) => void;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  resetFilters: () => void;
  createItem: (input: BacklogItemInput) => Promise<string>;
  saveItem: (itemId: string, input: BacklogItemInput) => Promise<void>;
  markInProgress: (itemId: string) => Promise<void>;
  markCleared: (itemId: string) => Promise<void>;
  reopenItem: (itemId: string) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
}

const PRIORITY_WEIGHT: Record<AssignmentPriority, number> = {
  High: 0,
  Medium: 1,
  Low: 2
};

const LEVEL_WEIGHT: Record<BacklogLevel, number> = {
  Heavy: 0,
  Medium: 1,
  Light: 2
};

function getTimestampDateKey(value: BacklogItem["clearedAt"]): string | null {
  if (value && typeof value.toDate === "function") {
    return getDateKey(value.toDate());
  }

  return null;
}

function sortBacklogItems(items: BacklogItem[]): BacklogItem[] {
  return [...items].sort((a, b) => {
    const statusSort = Number(a.status === "Cleared") - Number(b.status === "Cleared");

    if (statusSort !== 0) {
      return statusSort;
    }

    const prioritySort = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];

    if (prioritySort !== 0) {
      return prioritySort;
    }

    const targetSort = String(a.targetFinishDate ?? "9999-12-31").localeCompare(String(b.targetFinishDate ?? "9999-12-31"));

    if (targetSort !== 0) {
      return targetSort;
    }

    return LEVEL_WEIGHT[a.backlogLevel] - LEVEL_WEIGHT[b.backlogLevel] || a.title.localeCompare(b.title);
  });
}

export function useBacklogItems(userId?: string | null): UseBacklogItemsResult {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(READ_LIMITS.backlogItemsPage);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<BacklogStatusFilter>("all");
  const [levelFilter, setLevelFilter] = useState<BacklogLevelFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<BacklogPriorityFilter>("all");

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const cacheKey = `backlogItems:${userId}:${pageSize}`;
    const cachedItems = getClientCache<BacklogItem[]>(cacheKey);

    if (cachedItems) {
      setItems(cachedItems);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      return subscribeToBacklogItems(
        userId,
        (nextItems) => {
          const sorted = sortBacklogItems(nextItems);
          setClientCache(cacheKey, sorted);
          setItems(sorted);
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

  const activeItems = useMemo(() => sortBacklogItems(items.filter((item) => item.status !== "Cleared")), [items]);
  const clearedItems = useMemo(() => items.filter((item) => item.status === "Cleared"), [items]);
  const filteredItems = useMemo(() => {
    return sortBacklogItems(
      items.filter((item) => {
        if (subjectFilter && item.subjectId !== subjectFilter) {
          return false;
        }

        if (statusFilter !== "all" && item.status !== statusFilter) {
          return false;
        }

        if (levelFilter !== "all" && item.backlogLevel !== levelFilter) {
          return false;
        }

        if (priorityFilter !== "all" && item.priority !== priorityFilter) {
          return false;
        }

        return true;
      })
    );
  }, [items, levelFilter, priorityFilter, statusFilter, subjectFilter]);
  const heavyCount = useMemo(() => activeItems.filter((item) => item.backlogLevel === "Heavy").length, [activeItems]);
  const overdueTargetCount = useMemo(() => {
    const today = getTodayDateKey();

    return activeItems.filter((item) => item.targetFinishDate && item.targetFinishDate < today).length;
  }, [activeItems]);
  const clearedThisWeek = useMemo(() => {
    const range = getWeekDateRange();

    return clearedItems.filter((item) => {
      const clearedDate = getTimestampDateKey(item.clearedAt);
      return clearedDate ? clearedDate >= range.start && clearedDate <= range.end : false;
    }).length;
  }, [clearedItems]);

  const loadMore = useCallback(() => {
    setPageSize((currentSize) => currentSize + READ_LIMITS.backlogItemsPage);
  }, []);

  const resetFilters = useCallback(() => {
    setSubjectFilter("");
    setStatusFilter("all");
    setLevelFilter("all");
    setPriorityFilter("all");
  }, []);

  const createItem = useCallback(
    async (input: BacklogItemInput) => {
      if (!userId) {
        throw new Error("Login is required before adding backlog.");
      }

      return addBacklogItem(userId, input);
    },
    [userId]
  );

  const saveItem = useCallback(async (itemId: string, input: BacklogItemInput) => {
    await updateBacklogItem(itemId, input);
  }, []);

  const markInProgress = useCallback(async (itemId: string) => {
    await setBacklogItemStatus(itemId, "In Progress");
  }, []);

  const markCleared = useCallback(async (itemId: string) => {
    await setBacklogItemStatus(itemId, "Cleared");
  }, []);

  const reopenItem = useCallback(async (itemId: string) => {
    await setBacklogItemStatus(itemId, "Not Started");
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    await deleteBacklogItem(itemId);
  }, []);

  return {
    items,
    activeItems,
    clearedItems,
    filteredItems,
    heavyCount,
    clearedThisWeek,
    overdueTargetCount,
    subjectFilter,
    setSubjectFilter,
    statusFilter,
    setStatusFilter,
    levelFilter,
    setLevelFilter,
    priorityFilter,
    setPriorityFilter,
    loading,
    error,
    hasMore: items.length >= pageSize,
    loadMore,
    resetFilters,
    createItem,
    saveItem,
    markInProgress,
    markCleared,
    reopenItem,
    removeItem
  };
}
