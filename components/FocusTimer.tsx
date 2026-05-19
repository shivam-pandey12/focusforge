"use client";

import { useEffect, useMemo, useState } from "react";
import SectionHeader from "@/components/SectionHeader";
import StatusMessage from "@/components/StatusMessage";
import {
  clearActiveFocusSession,
  writeActiveFocusSession
} from "@/lib/activeFocusSession";
import type { FocusSessionInput } from "@/lib/firebase/firestore";

type TimerStatus = "idle" | "running" | "paused" | "finished" | "saved";

export interface FocusTimerTarget {
  title: string;
  subject?: string;
  subjectId?: string;
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

interface FocusTimerProps {
  target: FocusTimerTarget | null;
  modeLabel: string;
  plannedMinutes: number;
  notes?: string;
  onSaveSession: (input: FocusSessionInput) => Promise<void>;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getActualMinutes(plannedSeconds: number, secondsLeft: number): number {
  const elapsedMinutes = Math.round((plannedSeconds - secondsLeft) / 60);

  return Math.max(1, elapsedMinutes);
}

export default function FocusTimer({
  target,
  modeLabel,
  plannedMinutes,
  notes,
  onSaveSession
}: FocusTimerProps) {
  const fullDurationSeconds = useMemo(() => Math.max(1, plannedMinutes) * 60, [plannedMinutes]);
  const [secondsLeft, setSecondsLeft] = useState(fullDurationSeconds);
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [startedAtIso, setStartedAtIso] = useState("");
  const [endedAtIso, setEndedAtIso] = useState("");
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    setSecondsLeft(fullDurationSeconds);
    setStatus("idle");
    setError(null);
    setSaving(false);
    setSessionId("");
    setStartedAtIso("");
    setEndedAtIso("");
    setSummary(null);
  }, [fullDurationSeconds, target?.title]);

  useEffect(() => {
    if (status !== "running") {
      return;
    }

    const interval = window.setInterval(() => {
      setSecondsLeft((currentSeconds) => {
        if (currentSeconds <= 1) {
          window.clearInterval(interval);
          setEndedAtIso(new Date().toISOString());
          setStatus("finished");
          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [status]);

  function persistActiveSession(nextStatus: "running" | "paused", nextSessionId = sessionId, nextStartedAt = startedAtIso) {
    if (!target || !nextSessionId || !nextStartedAt) {
      return;
    }

    writeActiveFocusSession({
      id: nextSessionId,
      title: target.title,
      mode: modeLabel,
      plannedDuration: plannedMinutes,
      subject: target.subject,
      startedAt: nextStartedAt,
      updatedAt: new Date().toISOString(),
      status: nextStatus,
      taskId: target.taskId,
      revisionPlanId: target.revisionPlanId,
      assignmentId: target.assignmentId,
      backlogItemId: target.backlogItemId,
      sourceType: target.sourceType,
      sourceId: target.sourceId,
      battlePlanId: target.battlePlanId,
      battlePlanItemId: target.battlePlanItemId,
      chapterId: target.chapterId,
      topicId: target.topicId
    });
  }

  function handleStart() {
    if (!target) {
      setError("Choose what you are focusing on before starting the timer.");
      return;
    }

    const nextStartedAt = new Date().toISOString();
    const nextSessionId = `focus-${Date.now()}`;

    setSessionId(nextSessionId);
    setStartedAtIso(nextStartedAt);
    setEndedAtIso("");
    setSummary(null);
    setError(null);
    setStatus("running");
    persistActiveSession("running", nextSessionId, nextStartedAt);
  }

  function handlePause() {
    setStatus("paused");
    persistActiveSession("paused");
  }

  function handleResume() {
    if (!target) {
      setError("Choose a focus target before resuming the timer.");
      return;
    }

    setError(null);
    setStatus("running");
    persistActiveSession("running");
  }

  function handleReset() {
    clearActiveFocusSession(sessionId);
    setSecondsLeft(fullDurationSeconds);
    setStatus("idle");
    setError(null);
    setSessionId("");
    setStartedAtIso("");
    setEndedAtIso("");
    setSummary(null);
  }

  function buildInput(sessionStatus: "completed" | "abandoned"): FocusSessionInput | null {
    if (!target || !startedAtIso) {
      setError("Start the session before saving it.");
      return null;
    }

    const finishedAt = endedAtIso || new Date().toISOString();
    const actualDuration = sessionStatus === "completed"
      ? getActualMinutes(fullDurationSeconds, secondsLeft)
      : Math.max(0, Math.round((fullDurationSeconds - secondsLeft) / 60));

    return {
      taskId: target.taskId,
      taskTitle: target.title,
      subject: target.subject,
      subjectId: target.subjectId,
      revisionPlanId: target.revisionPlanId,
      assignmentId: target.assignmentId,
      backlogItemId: target.backlogItemId,
      sourceType: target.sourceType,
      sourceId: target.sourceId,
      battlePlanId: target.battlePlanId,
      battlePlanItemId: target.battlePlanItemId,
      chapterId: target.chapterId,
      topicId: target.topicId,
      plannedDuration: plannedMinutes,
      actualDuration,
      startedAtIso,
      endedAtIso: finishedAt,
      status: sessionStatus,
      notes
    };
  }

  async function saveSession(sessionStatus: "completed" | "abandoned") {
    const input = buildInput(sessionStatus);

    if (!input) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSaveSession(input);
      clearActiveFocusSession(sessionId);
      setStatus("saved");
      setSummary(
        sessionStatus === "completed"
          ? `Saved ${input.actualDuration} minutes for ${target?.title ?? "focus"}.`
          : "Session abandoned and saved in history."
      );
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not save this session.");
    } finally {
      setSaving(false);
    }
  }

  function handleFinishNow() {
    setEndedAtIso(new Date().toISOString());
    setStatus("finished");
  }

  return (
    <section className="card p-7 sm:p-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <SectionHeader
          eyebrow="Focus session"
          title={target ? target.title : "Choose a focus target"}
          subtitle={
            target
              ? `${modeLabel} / ${plannedMinutes} minutes${target.subject ? ` / ${target.subject}` : ""}`
              : "Pick a task, revision item, homework item, subject, or topic to start."
          }
        />
        <div className="rounded-[2rem] border border-forge-line bg-white px-8 py-7 text-center shadow-soft sm:px-12 sm:py-9">
          <p className="text-base font-bold text-forge-muted">Countdown</p>
          <p className="mt-3 tabular-nums text-7xl font-bold leading-none text-forge-text sm:text-8xl">
            {formatTime(secondsLeft)}
          </p>
          <p className="mt-4 text-base font-bold uppercase tracking-[0.16em] text-forge-gold">
            {status === "finished" ? "Ready to save" : status}
          </p>
        </div>
      </div>

      <div className="mt-9 flex flex-wrap gap-3">
        <button
          className="btn-primary"
          type="button"
          onClick={handleStart}
          disabled={!target || status === "running" || status === "finished" || status === "saved"}
        >
          Start
        </button>
        <button className="btn-secondary" type="button" onClick={handlePause} disabled={status !== "running"}>
          Pause
        </button>
        <button className="btn-secondary" type="button" onClick={handleResume} disabled={status !== "paused"}>
          Resume
        </button>
        <button className="btn-secondary" type="button" onClick={handleFinishNow} disabled={status !== "running" && status !== "paused"}>
          Complete now
        </button>
        <button className="btn-ghost" type="button" onClick={handleReset} disabled={status === "running"}>
          Reset
        </button>
        {status === "running" || status === "paused" ? (
          <button className="btn-danger" type="button" onClick={() => void saveSession("abandoned")} disabled={saving}>
            {saving ? "Saving" : "Abandon"}
          </button>
        ) : null}
        {status === "finished" ? (
          <button className="btn-primary" type="button" onClick={() => void saveSession("completed")} disabled={saving}>
            {saving ? "Saving" : "Save Session"}
          </button>
        ) : null}
      </div>

      {status === "finished" ? (
        <StatusMessage className="mt-7" tone="success">
          Session complete. Saving records the focus time; only linked daily tasks are completed automatically.
        </StatusMessage>
      ) : null}

      {summary ? <StatusMessage className="mt-7" tone="success">{summary}</StatusMessage> : null}
      {error ? <StatusMessage className="mt-7" tone="error">{error}</StatusMessage> : null}
    </section>
  );
}
