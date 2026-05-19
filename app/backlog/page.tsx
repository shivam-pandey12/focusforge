"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import EmptyState from "@/components/EmptyState";
import LimitReachedNotice from "@/components/LimitReachedNotice";
import LoadingState from "@/components/LoadingState";
import MetricCard from "@/components/MetricCard";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import StatusMessage from "@/components/StatusMessage";
import { useAuth } from "@/hooks/useAuth";
import { useBacklogItems } from "@/hooks/useBacklogItems";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useDeferredDataStart } from "@/hooks/useDeferredDataStart";
import { usePlan } from "@/hooks/usePlan";
import { useRevisions } from "@/hooks/useRevisions";
import { useSyllabus } from "@/hooks/useSyllabus";
import { getTodayDateKey } from "@/lib/date";
import { getLimitUsage } from "@/lib/plans";
import type { BacklogItemInput } from "@/lib/firebase/firestore";
import type { AssignmentPriority, BacklogItem, BacklogLevel, BacklogReason, BacklogStatus, SyllabusTopic } from "@/types";

const backlogLevels: BacklogLevel[] = ["Light", "Medium", "Heavy"];
const backlogReasons: BacklogReason[] = ["Missed Class", "Weak Concept", "Low Marks", "Not Revised", "Homework Pending", "Other"];
const backlogStatuses: BacklogStatus[] = ["Not Started", "In Progress", "Cleared"];
const priorities: AssignmentPriority[] = ["Low", "Medium", "High"];

const defaultForm = {
  title: "",
  subjectId: "",
  subject: "",
  chapterId: "",
  chapterName: "",
  topicId: "",
  topicName: "",
  mockTestId: "",
  sourceType: "",
  sourceId: "",
  backlogLevel: "Medium" as BacklogLevel,
  reason: "Weak Concept" as BacklogReason,
  targetFinishDate: "",
  estimatedMinutes: "",
  status: "Not Started" as BacklogStatus,
  priority: "Medium" as AssignmentPriority,
  notes: ""
};

function BacklogContent() {
  const { user, loading: authLoading } = useAuth();
  const dataReady = useDeferredDataStart();
  const plan = usePlan(user?.uid);
  const syllabus = useSyllabus(dataReady ? user?.uid : undefined);
  const backlog = useBacklogItems(dataReady ? user?.uid : undefined);
  const revisions = useRevisions(dataReady ? user?.uid : undefined);
  const { confirm, confirmDialog } = useConfirmDialog();
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const queryPrefilled = useRef(false);
  const selectedSubject = syllabus.subjects.find((subject) => subject.id === form.subjectId) ?? null;
  const selectedChapter = syllabus.chapters.find((chapter) => chapter.id === form.chapterId) ?? null;
  const selectedTopic = syllabus.topics.find((topic) => topic.id === form.topicId) ?? null;
  const subjectChapters = useMemo(
    () => syllabus.chapters.filter((chapter) => chapter.subjectId === form.subjectId),
    [form.subjectId, syllabus.chapters]
  );
  const chapterTopics = useMemo(
    () => syllabus.topics.filter((topic) => topic.chapterId === form.chapterId),
    [form.chapterId, syllabus.topics]
  );
  const backlogUsage = getLimitUsage(backlog.items.length, plan.limits.backlogItemsLimit);
  const limitReached = backlogUsage.isAtLimit;
  const freeSlotsLabel = backlogUsage.isLimited ? `${backlogUsage.remaining} free slots left` : "Unlimited backlog";

  useEffect(() => {
    if (queryPrefilled.current || !dataReady || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const sourceType = params.get("sourceType");
    const sourceId = params.get("sourceId");
    const mockTestId = params.get("mockTestId");
    const topicId = params.get("topicId");
    const topic = topicId ? syllabus.topics.find((item) => item.id === topicId) : null;

    if (!topic && !params.get("title")) {
      return;
    }

    queryPrefilled.current = true;
    const subjectId = params.get("subjectId") ?? topic?.subjectId ?? "";
    const chapterId = params.get("chapterId") ?? topic?.chapterId ?? "";
    const subject = syllabus.subjects.find((item) => item.id === subjectId);
    const chapter = syllabus.chapters.find((item) => item.id === chapterId);

    setForm((current) => ({
      ...current,
      title: current.title || params.get("title") || topic?.name || "",
      subjectId,
      subject: params.get("subject") ?? subject?.name ?? current.subject,
      chapterId,
      chapterName: params.get("chapterName") ?? chapter?.name ?? current.chapterName,
      topicId: topic?.id ?? topicId ?? "",
      topicName: params.get("topicName") ?? topic?.name ?? "",
      mockTestId: mockTestId ?? "",
      sourceType: sourceType ?? "",
      sourceId: sourceId ?? mockTestId ?? "",
      backlogLevel: (params.get("backlogLevel") as BacklogLevel | null) ?? current.backlogLevel,
      reason: (params.get("reason") as BacklogReason | null) ?? "Weak Concept",
      priority: (params.get("priority") as AssignmentPriority | null) ?? current.priority,
      notes: params.get("notes") ?? current.notes,
      status: "Not Started"
    }));
  }, [dataReady, syllabus.chapters, syllabus.subjects, syllabus.topics]);

  if (authLoading || !user) {
    return <LoadingState label="Loading backlog" />;
  }

  function resetForm() {
    setForm(defaultForm);
    setEditingId(null);
  }

  function buildInput(): BacklogItemInput {
    const subjectName = selectedSubject?.name ?? form.subject.trim();
    const chapterName = selectedChapter?.name ?? form.chapterName.trim();
    const topicName = selectedTopic?.name ?? form.topicName.trim();

    return {
      title: form.title,
      subjectId: selectedSubject?.id ?? form.subjectId,
      subject: subjectName,
      subjectColor: selectedSubject?.color,
      subjectIcon: selectedSubject?.icon,
      chapterId: selectedChapter?.id ?? form.chapterId,
      chapterName,
      topicId: selectedTopic?.id ?? form.topicId,
      topicName,
      mockTestId: form.mockTestId,
      sourceType: form.sourceType,
      sourceId: form.sourceId,
      backlogLevel: form.backlogLevel,
      reason: form.reason,
      targetFinishDate: form.targetFinishDate,
      estimatedMinutes: form.estimatedMinutes || null,
      status: form.status,
      priority: form.priority,
      notes: form.notes
    };
  }

  function editItem(item: BacklogItem) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      subjectId: item.subjectId ?? "",
      subject: item.subject,
      chapterId: item.chapterId ?? "",
      chapterName: item.chapterName ?? "",
      topicId: item.topicId ?? "",
      topicName: item.topicName ?? "",
      mockTestId: item.mockTestId ?? "",
      sourceType: item.sourceType ?? "",
      sourceId: item.sourceId ?? "",
      backlogLevel: item.backlogLevel,
      reason: item.reason,
      targetFinishDate: item.targetFinishDate ?? "",
      estimatedMinutes: item.estimatedMinutes ? String(item.estimatedMinutes) : "",
      status: item.status,
      priority: item.priority,
      notes: item.notes ?? ""
    });
    setActionError(null);
    setSuccess(null);
  }

  async function runAction(action: () => Promise<void>, message: string) {
    setActionError(null);
    setSuccess(null);

    try {
      await action();
      setSuccess(message);
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : "Backlog action failed.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setActionError(null);
    setSuccess(null);

    try {
      if (!editingId && limitReached) {
        throw new Error("Forge Starter includes 20 backlog items. Your existing backlog stays safe, and Forge Pro unlocks unlimited backlog tracking.");
      }

      if (editingId) {
        await backlog.saveItem(editingId, buildInput());
        setSuccess("Backlog item updated.");
      } else {
        await backlog.createItem(buildInput());
        setSuccess("Backlog item created.");
      }

      resetForm();
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : "Could not save backlog item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: BacklogItem) {
    const confirmed = await confirm({
      eyebrow: "Delete backlog",
      title: `Delete "${item.title}"?`,
      description: "This removes the backlog card only. Linked subjects, topics, revisions, and focus history stay untouched.",
      confirmLabel: "Delete backlog",
      tone: "danger"
    });

    if (!confirmed) {
      return;
    }

    await runAction(async () => {
      await backlog.removeItem(item.id);
      if (editingId === item.id) {
        resetForm();
      }
    }, "Backlog item deleted.");
  }

  async function createRevision(item: BacklogItem) {
    await runAction(
      () => revisions.createPlan({
        title: item.topicName ? `${item.topicName} final revision` : `${item.title} revision`,
        subjectId: item.subjectId,
        subject: item.subject,
        chapterId: item.chapterId,
        chapterName: item.chapterName,
        topicId: item.topicId,
        topicName: item.topicName,
        backlogItemId: item.id,
        revisionType: item.topicName ? "Question Practice" : "Theory",
        priority: item.priority,
        status: "Pending",
        dueDate: getTodayDateKey(),
        notes: `Created from backlog: ${item.reason}`
      }),
      "Revision created from backlog."
    );
  }

  return (
    <>
      <Navbar email={user.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Backlog"
          title="Turn missed and weak topics into a clear recovery list."
          subtitle="Backlog items keep snapshots, so old cards stay readable even if syllabus data changes later."
          action={
            <div className="flex flex-wrap gap-2">
              <Link className="btn-primary" href="/battle-plan">Generate battle plan</Link>
              <Link className="btn-secondary" href="/docs#backlog-battle-plan">Backlog guide</Link>
            </div>
          }
        />

        {syllabus.error || backlog.error || revisions.error ? <StatusMessage tone="error">{syllabus.error ?? backlog.error ?? revisions.error}</StatusMessage> : null}
        {actionError ? <StatusMessage tone="error">{actionError}</StatusMessage> : null}
        {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}

        <section className="grid gap-5 md:grid-cols-4">
          <MetricCard label="Active backlog" value={backlog.activeItems.length} detail={freeSlotsLabel} tone="gold" />
          <MetricCard label="Heavy" value={backlog.heavyCount} detail="Needs deeper recovery" tone={backlog.heavyCount > 0 ? "warning" : "default"} />
          <MetricCard label="Overdue target" value={backlog.overdueTargetCount} detail="Past target finish date" tone={backlog.overdueTargetCount > 0 ? "warning" : "default"} />
          <MetricCard label="Cleared this week" value={backlog.clearedThisWeek} detail="Backlog recovery wins" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[26rem_1fr]">
          <form id="backlog-form" className="card space-y-5 p-6 sm:p-8" onSubmit={handleSubmit}>
            <div>
              <p className="eyebrow">{editingId ? "Edit backlog" : "New backlog"}</p>
              <h2 className="section-title">Recovery item</h2>
            </div>

            <label className="grid gap-2">
              <span className="label">Title</span>
              <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Integration backlog" required />
            </label>

            <label className="grid gap-2">
              <span className="label">Subject</span>
              <select
                className="input"
                value={form.subjectId}
                onChange={(event) => {
                  const subject = syllabus.subjects.find((item) => item.id === event.target.value);
                  setForm({
                    ...form,
                    subjectId: subject?.id ?? "",
                    subject: subject?.name ?? "",
                    chapterId: "",
                    chapterName: "",
                    topicId: "",
                    topicName: ""
                  });
                }}
              >
                <option value="">Choose subject</option>
                {syllabus.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="label">Subject snapshot</span>
              <input className="input" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="Used if the subject is later deleted" required />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="label">Chapter optional</span>
                <select
                  className="input"
                  value={form.chapterId}
                  onChange={(event) => {
                    const chapter = syllabus.chapters.find((item) => item.id === event.target.value);
                    setForm({ ...form, chapterId: chapter?.id ?? "", chapterName: chapter?.name ?? "", topicId: "", topicName: "" });
                  }}
                >
                  <option value="">No chapter</option>
                  {subjectChapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="label">Topic optional</span>
                <select
                  className="input"
                  value={form.topicId}
                  onChange={(event) => {
                    const topic = syllabus.topics.find((item) => item.id === event.target.value);
                    setForm({
                      ...form,
                      topicId: topic?.id ?? "",
                      topicName: topic?.name ?? "",
                      title: form.title || topic?.name || ""
                    });
                  }}
                >
                  <option value="">No topic</option>
                  {chapterTopics.map((topic: SyllabusTopic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="label">Backlog level</span>
                <select className="input" value={form.backlogLevel} onChange={(event) => setForm({ ...form, backlogLevel: event.target.value as BacklogLevel })}>
                  {backlogLevels.map((level) => <option key={level} value={level}>{level}</option>)}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="label">Reason</span>
                <select className="input" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value as BacklogReason })}>
                  {backlogReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="label">Priority</span>
                <select className="input" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as AssignmentPriority })}>
                  {priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="label">Status</span>
                <select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as BacklogStatus })}>
                  {backlogStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="label">Target finish optional</span>
                <input className="input" type="date" value={form.targetFinishDate} onChange={(event) => setForm({ ...form, targetFinishDate: event.target.value })} />
              </label>
              <label className="grid gap-2">
                <span className="label">Estimated minutes optional</span>
                <input className="input" min={5} type="number" value={form.estimatedMinutes} onChange={(event) => setForm({ ...form, estimatedMinutes: event.target.value })} placeholder="45" />
              </label>
            </div>

            <label className="grid gap-2">
              <span className="label">Notes optional</span>
              <textarea className="input min-h-24" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="What exactly needs to be fixed?" />
            </label>

            {!editingId && limitReached ? <LimitReachedNotice currentPlan={plan.plan} limitLabel="Forge Starter includes 20 backlog items." usageLabel={backlogUsage.label} /> : null}

            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" disabled={saving} type="submit">
                {saving ? "Saving" : editingId ? "Save backlog" : "Add backlog"}
              </button>
              {editingId ? <button className="btn-ghost" type="button" onClick={resetForm}>Cancel</button> : null}
            </div>
          </form>

          <section className="space-y-5">
            <section className="card p-5">
              <SectionHeader eyebrow="Filters" title="Find the right recovery item" />
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <label className="grid gap-2">
                  <span className="label">Subject</span>
                  <select className="input" value={backlog.subjectFilter} onChange={(event) => backlog.setSubjectFilter(event.target.value)}>
                    <option value="">All subjects</option>
                    {syllabus.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="label">Status</span>
                  <select className="input" value={backlog.statusFilter} onChange={(event) => backlog.setStatusFilter(event.target.value as "all" | BacklogStatus)}>
                    <option value="all">All statuses</option>
                    {backlogStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="label">Level</span>
                  <select className="input" value={backlog.levelFilter} onChange={(event) => backlog.setLevelFilter(event.target.value as "all" | BacklogLevel)}>
                    <option value="all">All levels</option>
                    {backlogLevels.map((level) => <option key={level} value={level}>{level}</option>)}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="label">Priority</span>
                  <select className="input" value={backlog.priorityFilter} onChange={(event) => backlog.setPriorityFilter(event.target.value as "all" | AssignmentPriority)}>
                    <option value="all">All priorities</option>
                    {priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                  </select>
                </label>
              </div>
              <button className="btn-secondary mt-4" type="button" onClick={backlog.resetFilters}>Reset filters</button>
            </section>

            {!dataReady || syllabus.loading || backlog.loading ? (
              <LoadingState label="Loading backlog items" mode="inline" />
            ) : backlog.items.length === 0 ? (
              <EmptyState title="No backlog yet" description="Add missed classes, weak concepts, or topics that need recovery." />
            ) : backlog.filteredItems.length === 0 ? (
              <EmptyState title="No backlog matches" description="Reset filters or add another recovery item." />
            ) : (
              <div className="grid gap-4">
                {backlog.filteredItems.map((item) => (
                  <BacklogCard
                    key={item.id}
                    item={item}
                    onClear={() => runAction(() => backlog.markCleared(item.id), "Backlog marked cleared.")}
                    onDelete={() => handleDelete(item)}
                    onEdit={() => editItem(item)}
                    onProgress={() => runAction(() => backlog.markInProgress(item.id), "Backlog marked in progress.")}
                    onReopen={() => runAction(() => backlog.reopenItem(item.id), "Backlog reopened.")}
                    onRevision={() => createRevision(item)}
                  />
                ))}
              </div>
            )}
          </section>
        </section>
      </main>
      {confirmDialog}
    </>
  );
}

function BacklogCard({
  item,
  onEdit,
  onDelete,
  onProgress,
  onClear,
  onReopen,
  onRevision
}: {
  item: BacklogItem;
  onEdit: () => void;
  onDelete: () => void;
  onProgress: () => void;
  onClear: () => void;
  onReopen: () => void;
  onRevision: () => void;
}) {
  return (
    <article className="card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className={item.priority === "High" ? "badge badge-warning" : "badge"}>{item.priority}</span>
            <span className={item.status === "Cleared" ? "badge badge-done" : "badge badge-open"}>{item.status}</span>
            <span className="badge">{item.backlogLevel}</span>
          </div>
          <h2 className="mt-3 text-xl font-bold text-forge-text">{item.title}</h2>
          <p className="mt-1 text-sm font-semibold text-forge-muted">
            {[item.subject, item.chapterName, item.topicName].filter(Boolean).join(" / ")}
          </p>
          <p className="mt-2 text-sm text-forge-muted">
            {item.reason}{item.targetFinishDate ? ` / target ${item.targetFinishDate}` : ""}{item.estimatedMinutes ? ` / ${item.estimatedMinutes}m` : ""}
          </p>
          {item.notes ? <p className="mt-2 text-sm leading-6 text-forge-muted">{item.notes}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {item.status === "Cleared" ? (
            <button className="btn-ghost" type="button" onClick={onReopen}>Reopen</button>
          ) : (
            <>
              <button className="btn-ghost" type="button" onClick={onProgress}>In progress</button>
              <button className="btn-secondary" type="button" onClick={onClear}>Clear</button>
            </>
          )}
          <Link className="btn-primary" href={`/focus?backlogItemId=${encodeURIComponent(item.id)}`}>Start focus</Link>
          <button className="btn-ghost" type="button" onClick={onRevision}>Create revision</button>
          <button className="btn-ghost" type="button" onClick={onEdit}>Edit</button>
          <button className="btn-ghost" type="button" onClick={onDelete}>Delete</button>
        </div>
      </div>
    </article>
  );
}

export default function BacklogPage() {
  return (
    <AuthGuard>
      <BacklogContent />
    </AuthGuard>
  );
}
