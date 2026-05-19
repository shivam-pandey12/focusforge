"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import EmptyState from "@/components/EmptyState";
import FocusTimer, { type FocusTimerTarget } from "@/components/FocusTimer";
import LoadingState from "@/components/LoadingState";
import MetricCard from "@/components/MetricCard";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import StatusMessage from "@/components/StatusMessage";
import { useAssignments } from "@/hooks/useAssignments";
import { useBacklogItems } from "@/hooks/useBacklogItems";
import { useAuth } from "@/hooks/useAuth";
import { useFocusSessionActions } from "@/hooks/useSessions";
import { usePlan } from "@/hooks/usePlan";
import { useRevisions } from "@/hooks/useRevisions";
import { useSyllabus } from "@/hooks/useSyllabus";
import { useTasks } from "@/hooks/useTasks";
import { useUserSessions } from "@/hooks/useUserSessions";
import { formatDuration, getDateKeysBetween, getTodayDateKey, getWeekDateRange } from "@/lib/date";
import { getRevisionStatus } from "@/lib/revision";
import type { FocusSessionInput } from "@/lib/firebase/firestore";
import type { StudySession } from "@/types";

type FocusMode = "quick" | "deep" | "custom";
type HistoryRange = "today" | "week" | "all";
type HistoryStatus = "all" | "completed" | "abandoned";

function getModeDuration(mode: FocusMode, customMinutes: number): number {
  if (mode === "deep") {
    return 50;
  }

  if (mode === "custom") {
    return Math.max(5, Math.min(180, Math.round(customMinutes || 25)));
  }

  return 25;
}

function getModeLabel(mode: FocusMode): string {
  if (mode === "deep") {
    return "Deep Work";
  }

  if (mode === "custom") {
    return "Custom Focus";
  }

  return "Quick Focus";
}

function FocusContent() {
  const { user, loading: authLoading } = useAuth();
  const plan = usePlan(user?.uid);
  const historyDays = Number.isFinite(plan.limits.sessionsHistoryDays) ? plan.limits.sessionsHistoryDays : 365;
  const { incompleteTasks, loading: tasksLoading, error: tasksError } = useTasks(user?.uid);
  const assignments = useAssignments(user?.uid);
  const backlog = useBacklogItems(user?.uid);
  const revisions = useRevisions(user?.uid);
  const syllabus = useSyllabus(user?.uid);
  const history = useUserSessions(user?.uid, historyDays);
  const { saveFocusSession, pendingOfflineSessions, error: saveActionError } = useFocusSessionActions(user?.uid);
  const [targetKey, setTargetKey] = useState("");
  const [externalTarget, setExternalTarget] = useState<FocusTimerTarget | null>(null);
  const [battleContext, setBattleContext] = useState<Pick<FocusTimerTarget, "battlePlanId" | "battlePlanItemId">>({});
  const [mode, setMode] = useState<FocusMode>("quick");
  const [customMinutes, setCustomMinutes] = useState(25);
  const [notes, setNotes] = useState("");
  const [historyRange, setHistoryRange] = useState<HistoryRange>("week");
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>("all");
  const [historySubject, setHistorySubject] = useState("");
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const targetOptions = useMemo(() => {
    const taskOptions = incompleteTasks.map((task) => ({
      key: `task:${task.id}`,
      label: `Task - ${task.title}${task.subject ? ` / ${task.subject}` : ""}`
    }));
    const revisionOptions = revisions.plans
      .filter((revision) => getRevisionStatus(revision) === "Pending")
      .map((revision) => ({
        key: `revision:${revision.id}`,
        label: `Revision - ${revision.title} / ${revision.subject || "No subject"}`
      }));
    const assignmentOptions = assignments.pendingAssignments.map((assignment) => ({
      key: `assignment:${assignment.id}`,
      label: `Homework - ${assignment.title} / ${assignment.subject}`
    }));
    const backlogOptions = backlog.activeItems.map((item) => ({
      key: `backlog:${item.id}`,
      label: `Backlog - ${item.title} / ${item.subject}`
    }));
    const topicOptions = syllabus.topics.map((topic) => {
      const subject = syllabus.subjects.find((item) => item.id === topic.subjectId);

      return {
        key: `topic:${topic.id}`,
        label: `Topic - ${topic.name}${subject ? ` / ${subject.name}` : ""}`
      };
    });
    const subjectOptions = syllabus.subjects.map((subject) => ({
      key: `subject:${subject.id}`,
      label: `Subject - ${subject.name}`
    }));

    const externalOption = externalTarget ? [{ key: "external", label: `Plan - ${externalTarget.title}${externalTarget.subject ? ` / ${externalTarget.subject}` : ""}` }] : [];

    return [...externalOption, ...taskOptions, ...revisionOptions, ...assignmentOptions, ...backlogOptions, ...topicOptions, ...subjectOptions];
  }, [assignments.pendingAssignments, backlog.activeItems, externalTarget, incompleteTasks, revisions.plans, syllabus.subjects, syllabus.topics]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTaskId = params.get("taskId");
    const requestedAssignmentId = params.get("assignmentId");
    const requestedRevisionId = params.get("revisionPlanId");
    const requestedBacklogId = params.get("backlogItemId");
    const requestedTopicId = params.get("topicId");
    const requestedSubjectId = params.get("subjectId");
    const sourceType = params.get("sourceType");
    const sourceId = params.get("sourceId");
    const targetTitle = params.get("targetTitle");
    const nextBattleContext = {
      battlePlanId: params.get("battlePlanId") ?? undefined,
      battlePlanItemId: params.get("battlePlanItemId") ?? undefined
    };

    setBattleContext(nextBattleContext);

    if (requestedTaskId) {
      setTargetKey(`task:${requestedTaskId}`);
      return;
    }

    if (requestedAssignmentId) {
      setTargetKey(`assignment:${requestedAssignmentId}`);
      return;
    }

    if (requestedRevisionId) {
      setTargetKey(`revision:${requestedRevisionId}`);
      return;
    }

    if (requestedBacklogId) {
      setTargetKey(`backlog:${requestedBacklogId}`);
      return;
    }

    if (requestedTopicId) {
      setTargetKey(`topic:${requestedTopicId}`);
      return;
    }

    if (targetTitle) {
      setExternalTarget({
        title: targetTitle,
        subject: params.get("subject") ?? undefined,
        subjectId: params.get("subjectId") ?? undefined,
        sourceType: sourceType ?? "battle-plan",
        sourceId: sourceId ?? undefined,
        ...nextBattleContext
      });
      setTargetKey("external");
      return;
    }

    if (requestedSubjectId) {
      setTargetKey(`subject:${requestedSubjectId}`);
    }
  }, []);

  useEffect(() => {
    if (targetOptions.length === 0) {
      setTargetKey("");
      return;
    }

    if (!targetKey || !targetOptions.some((option) => option.key === targetKey)) {
      setTargetKey(targetOptions[0].key);
    }
  }, [targetKey, targetOptions]);

  const selectedTarget = useMemo<FocusTimerTarget | null>(() => {
    const [kind, id] = targetKey.split(":");

    if (!kind || !id) {
      return targetKey === "external" ? externalTarget : null;
    }

    if (kind === "external") {
      return externalTarget;
    }

    if (kind === "task") {
      const task = incompleteTasks.find((item) => item.id === id);
      return task ? { title: task.title, subject: task.subject, taskId: task.id, ...battleContext } : null;
    }

    if (kind === "revision") {
      const revision = revisions.plans.find((item) => item.id === id);
      return revision ? {
        title: revision.title,
        subject: revision.subject,
        subjectId: revision.subjectId,
        revisionPlanId: revision.id,
        chapterId: revision.chapterId,
        topicId: revision.topicId,
        ...battleContext
      } : null;
    }

    if (kind === "assignment") {
      const assignment = assignments.assignments.find((item) => item.id === id);
      return assignment ? {
        title: assignment.title,
        subject: assignment.subject,
        subjectId: assignment.subjectId,
        assignmentId: assignment.id,
        ...battleContext
      } : null;
    }

    if (kind === "backlog") {
      const item = backlog.items.find((entry) => entry.id === id);
      return item ? {
        title: item.title,
        subject: item.subject,
        subjectId: item.subjectId,
        backlogItemId: item.id,
        sourceType: "backlog",
        sourceId: item.id,
        chapterId: item.chapterId,
        topicId: item.topicId,
        ...battleContext
      } : null;
    }

    if (kind === "topic") {
      const topic = syllabus.topics.find((item) => item.id === id);
      const subject = topic ? syllabus.subjects.find((item) => item.id === topic.subjectId) : null;
      return topic ? {
        title: topic.name,
        subject: subject?.name,
        subjectId: topic.subjectId,
        chapterId: topic.chapterId,
        topicId: topic.id,
        ...battleContext
      } : null;
    }

    if (kind === "subject") {
      const subject = syllabus.subjects.find((item) => item.id === id);
      return subject ? { title: subject.name, subject: subject.name, subjectId: subject.id, ...battleContext } : null;
    }

    return null;
  }, [assignments.assignments, backlog.items, battleContext, externalTarget, incompleteTasks, revisions.plans, syllabus.subjects, syllabus.topics, targetKey]);

  const plannedMinutes = getModeDuration(mode, customMinutes);
  const modeLabel = getModeLabel(mode);

  const filteredHistory = useMemo(() => {
    const today = getTodayDateKey();
    const weekRange = getWeekDateRange();
    const weekDates = new Set(getDateKeysBetween(weekRange.start, weekRange.end));

    return history.sessions.filter((session) => {
      if (historyRange === "today" && session.date !== today) {
        return false;
      }

      if (historyRange === "week" && !weekDates.has(session.date)) {
        return false;
      }

      if (historyStatus !== "all" && (session.status ?? "completed") !== historyStatus) {
        return false;
      }

      if (historySubject && session.subjectId !== historySubject && session.subject !== syllabus.subjects.find((subject) => subject.id === historySubject)?.name) {
        return false;
      }

      return true;
    });
  }, [history.sessions, historyRange, historyStatus, historySubject, syllabus.subjects]);

  const todaySessions = useMemo(
    () => history.sessions.filter((session) => session.date === getTodayDateKey() && session.status !== "abandoned"),
    [history.sessions]
  );
  const weekSessions = useMemo(() => {
    const weekRange = getWeekDateRange();
    const weekDates = new Set(getDateKeysBetween(weekRange.start, weekRange.end));

    return history.sessions.filter((session) => weekDates.has(session.date) && session.status !== "abandoned");
  }, [history.sessions]);
  const subjectMinutes = useMemo(() => {
    const totals = new Map<string, number>();

    for (const session of filteredHistory) {
      if (session.status === "abandoned") {
        continue;
      }

      const key = session.subject || "No subject";
      totals.set(key, (totals.get(key) ?? 0) + (session.actualDuration ?? session.duration));
    }

    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [filteredHistory]);

  if (authLoading || !user) {
    return <LoadingState label="Loading focus room" />;
  }

  async function handleSaveSession(input: FocusSessionInput) {
    setSaveError(null);
    setSaveSuccess(null);

    try {
      await saveFocusSession(input);
      setSaveSuccess(input.status === "completed" ? "Focus session saved." : "Abandoned session saved in history.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save session.");
      throw error;
    }
  }

  return (
    <>
      <Navbar email={user.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Focus mode"
          title="Turn the plan into study time."
          subtitle="Start a quick focus block, deep work block, or custom session linked to the right task, revision, homework, topic, or subject."
          action={<Link className="btn-secondary" href="/dashboard">Back to dashboard</Link>}
        />

        {tasksError || assignments.error || backlog.error || revisions.error || syllabus.error ? (
          <StatusMessage tone="error">{tasksError ?? assignments.error ?? backlog.error ?? revisions.error ?? syllabus.error}</StatusMessage>
        ) : null}
        {saveError || saveActionError ? <StatusMessage tone="error">{saveError ?? saveActionError}</StatusMessage> : null}
        {saveSuccess ? <StatusMessage tone="success">{saveSuccess}</StatusMessage> : null}
        {pendingOfflineSessions > 0 ? (
          <StatusMessage tone="success">
            {pendingOfflineSessions} offline task focus session{pendingOfflineSessions === 1 ? "" : "s"} waiting to sync.
          </StatusMessage>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[26rem_1fr]">
          <section className="card space-y-5 p-6 sm:p-8">
            <SectionHeader
              eyebrow="Session setup"
              title="Choose the next block"
              subtitle="Completing a linked task still completes that task. Other links only record context."
            />

            {tasksLoading || assignments.loading || backlog.loading || revisions.loading || syllabus.loading ? (
              <LoadingState label="Loading focus targets" mode="inline" />
            ) : targetOptions.length === 0 ? (
              <EmptyState
                title="No focus targets yet"
                description="Add a task, subject, homework item, or revision item to start a linked session."
                action={<Link className="btn-primary" href="/dashboard">Add task</Link>}
              />
            ) : (
              <label className="grid gap-2">
                <span className="label">Focus target</span>
                <select className="input" value={targetKey} onChange={(event) => setTargetKey(event.target.value)}>
                  {targetOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                </select>
              </label>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <button className={mode === "quick" ? "btn-primary" : "btn-secondary"} type="button" onClick={() => setMode("quick")}>Quick 25</button>
              <button className={mode === "deep" ? "btn-primary" : "btn-secondary"} type="button" onClick={() => setMode("deep")}>Deep 50</button>
              <button className={mode === "custom" ? "btn-primary" : "btn-secondary"} type="button" onClick={() => setMode("custom")}>Custom</button>
            </div>

            {mode === "custom" ? (
              <label className="grid gap-2">
                <span className="label">Custom minutes</span>
                <input className="input" min={5} max={180} type="number" value={customMinutes} onChange={(event) => setCustomMinutes(Number(event.target.value))} />
              </label>
            ) : null}

            <label className="grid gap-2">
              <span className="label">Session notes</span>
              <textarea className="input min-h-24" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional: what you are trying to finish in this block." />
            </label>
          </section>

          <FocusTimer
            modeLabel={modeLabel}
            notes={notes}
            onSaveSession={handleSaveSession}
            plannedMinutes={plannedMinutes}
            target={selectedTarget}
          />
        </section>

        <FocusHistory
          filteredHistory={filteredHistory}
          history={history.sessions}
          historyError={history.error}
          historyLoading={history.loading}
          historyRange={historyRange}
          historyStatus={historyStatus}
          historySubject={historySubject}
          onRangeChange={setHistoryRange}
          onStatusChange={setHistoryStatus}
          onSubjectChange={setHistorySubject}
          subjects={syllabus.subjects}
          subjectMinutes={subjectMinutes}
          todayMinutes={todaySessions.reduce((total, session) => total + (session.actualDuration ?? session.duration), 0)}
          weekMinutes={weekSessions.reduce((total, session) => total + (session.actualDuration ?? session.duration), 0)}
        />
      </main>
    </>
  );
}

function FocusHistory({
  history,
  filteredHistory,
  subjectMinutes,
  subjects,
  todayMinutes,
  weekMinutes,
  historyRange,
  historyStatus,
  historySubject,
  historyLoading,
  historyError,
  onRangeChange,
  onStatusChange,
  onSubjectChange
}: {
  history: StudySession[];
  filteredHistory: StudySession[];
  subjectMinutes: Array<[string, number]>;
  subjects: Array<{ id: string; name: string }>;
  todayMinutes: number;
  weekMinutes: number;
  historyRange: HistoryRange;
  historyStatus: HistoryStatus;
  historySubject: string;
  historyLoading: boolean;
  historyError: string | null;
  onRangeChange: (range: HistoryRange) => void;
  onStatusChange: (status: HistoryStatus) => void;
  onSubjectChange: (subjectId: string) => void;
}) {
  return (
    <section className="card p-6 sm:p-8">
      <SectionHeader
        eyebrow="Focus history"
        title="Recent sessions and basic progress"
        subtitle="A simple execution log for today, this week, and recent study blocks."
      />

      {historyError ? <StatusMessage className="mt-4" tone="error">{historyError}</StatusMessage> : null}

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <MetricCard label="Today focus" value={todayMinutes} detail="minutes" />
        <MetricCard label="Week focus" value={weekMinutes} detail="minutes" />
        <MetricCard label="Completed" value={history.filter((session) => session.status !== "abandoned").length} />
        <MetricCard label="Abandoned" value={history.filter((session) => session.status === "abandoned").length} tone="warning" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <label className="grid gap-2">
          <span className="label">Date range</span>
          <select className="input" value={historyRange} onChange={(event) => onRangeChange(event.target.value as HistoryRange)}>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="all">All recent</option>
          </select>
        </label>
        <label className="grid gap-2">
          <span className="label">Status</span>
          <select className="input" value={historyStatus} onChange={(event) => onStatusChange(event.target.value as HistoryStatus)}>
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="abandoned">Abandoned</option>
          </select>
        </label>
        <label className="grid gap-2">
          <span className="label">Subject</span>
          <select className="input" value={historySubject} onChange={(event) => onSubjectChange(event.target.value)}>
            <option value="">All subjects</option>
            {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </label>
      </div>

      {historyLoading ? (
        <div className="mt-5"><LoadingState label="Loading focus history" mode="inline" /></div>
      ) : filteredHistory.length === 0 ? (
        <div className="mt-5">
          <EmptyState title="No sessions match" description="Complete or abandon a focus session to start building history." />
        </div>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_18rem]">
          <div className="grid gap-3">
            {filteredHistory.slice(0, 10).map((session) => (
              <article className="rounded-2xl border border-forge-line bg-white p-4" key={session.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-bold text-forge-text">{session.taskTitle || "Focus session"}</p>
                    <p className="mt-1 text-sm font-semibold text-forge-muted">
                      {[session.subject || "No subject", session.date, formatDuration(session.actualDuration ?? session.duration)].join(" / ")}
                    </p>
                    {session.notes ? <p className="mt-2 text-sm text-forge-muted">{session.notes}</p> : null}
                  </div>
                  <span className={session.status === "abandoned" ? "badge badge-warning" : "badge badge-done"}>
                    {session.status ?? "completed"}
                  </span>
                </div>
              </article>
            ))}
          </div>

          <aside className="rounded-3xl border border-forge-line bg-forge-surfaceAlt/60 p-5">
            <p className="eyebrow text-forge-muted">Subject focus</p>
            <div className="mt-4 grid gap-3">
              {subjectMinutes.length === 0 ? (
                <p className="text-sm font-semibold text-forge-muted">No subject-linked focus time yet.</p>
              ) : (
                subjectMinutes.slice(0, 6).map(([subject, minutes]) => (
                  <div className="rounded-2xl border border-forge-line bg-white p-3" key={subject}>
                    <p className="font-bold text-forge-text">{subject}</p>
                    <p className="mt-1 text-sm font-semibold text-forge-muted">{formatDuration(minutes)}</p>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

export default function FocusPage() {
  return (
    <AuthGuard>
      <FocusContent />
    </AuthGuard>
  );
}
