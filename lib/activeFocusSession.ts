export type ActiveFocusSessionStatus = "running" | "paused";

export interface ActiveFocusSessionSnapshot {
  id: string;
  title: string;
  mode: string;
  plannedDuration: number;
  subject?: string;
  startedAt: string;
  updatedAt: string;
  status: ActiveFocusSessionStatus;
  taskId?: string;
  revisionPlanId?: string;
  assignmentId?: string;
  backlogItemId?: string;
  sourceType?: string;
  sourceId?: string;
  battlePlanId?: string;
  battlePlanItemId?: string;
  chapterId?: string;
  topicId?: string;
}

const STORAGE_KEY = "focusforge:active-focus-session";

export function readActiveFocusSession(): ActiveFocusSessionSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<ActiveFocusSessionSnapshot>;

    if (!parsed.id || !parsed.title || !parsed.startedAt) {
      return null;
    }

    return {
      id: String(parsed.id),
      title: String(parsed.title),
      mode: String(parsed.mode ?? "Quick Focus"),
      plannedDuration: Number(parsed.plannedDuration ?? 25),
      subject: parsed.subject ? String(parsed.subject) : undefined,
      startedAt: String(parsed.startedAt),
      updatedAt: String(parsed.updatedAt ?? parsed.startedAt),
      status: parsed.status === "paused" ? "paused" : "running",
      taskId: parsed.taskId ? String(parsed.taskId) : undefined,
      revisionPlanId: parsed.revisionPlanId ? String(parsed.revisionPlanId) : undefined,
      assignmentId: parsed.assignmentId ? String(parsed.assignmentId) : undefined,
      backlogItemId: parsed.backlogItemId ? String(parsed.backlogItemId) : undefined,
      sourceType: parsed.sourceType ? String(parsed.sourceType) : undefined,
      sourceId: parsed.sourceId ? String(parsed.sourceId) : undefined,
      battlePlanId: parsed.battlePlanId ? String(parsed.battlePlanId) : undefined,
      battlePlanItemId: parsed.battlePlanItemId ? String(parsed.battlePlanItemId) : undefined,
      chapterId: parsed.chapterId ? String(parsed.chapterId) : undefined,
      topicId: parsed.topicId ? String(parsed.topicId) : undefined
    };
  } catch {
    return null;
  }
}

export function writeActiveFocusSession(session: ActiveFocusSessionSnapshot): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearActiveFocusSession(sessionId?: string): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!sessionId) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  const current = readActiveFocusSession();

  if (!current || current.id === sessionId) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
