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
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useDeferredDataStart } from "@/hooks/useDeferredDataStart";
import { usePlan } from "@/hooks/usePlan";
import { useRevisions } from "@/hooks/useRevisions";
import { useSyllabus } from "@/hooks/useSyllabus";
import { formatLongDate, getTodayDateKey } from "@/lib/date";
import { getLimitUsage } from "@/lib/plans";
import {
  REVISION_PRIORITIES,
  REVISION_STATUSES,
  REVISION_TYPES,
  getRevisionDueDate,
  getRevisionPriority,
  getRevisionStatus,
  getRevisionTopicLabel,
  getRevisionType,
  isRevisionActive
} from "@/lib/revision";
import type { AssignmentPriority, RevisionPlan, RevisionStatus, RevisionType } from "@/types";

type RevisionFilter = {
  subjectId: string;
  type: "all" | RevisionType;
  status: "all" | RevisionStatus;
  priority: "all" | AssignmentPriority;
};

const filterDefaults: RevisionFilter = {
  subjectId: "",
  type: "all",
  status: "all",
  priority: "all"
};

const revisionFormDefaults = {
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
  revisionType: "Theory" as RevisionType,
  priority: "Medium" as AssignmentPriority,
  status: "Pending" as RevisionStatus,
  dueDate: getTodayDateKey(),
  notes: ""
};

function RevisionContent() {
  const { user, loading: authLoading } = useAuth();
  const plan = usePlan(user?.uid);
  const dataReady = useDeferredDataStart();
  const revisions = useRevisions(dataReady ? user?.uid : undefined);
  const syllabus = useSyllabus(dataReady ? user?.uid : undefined);
  const { confirm, confirmDialog } = useConfirmDialog();
  const [form, setForm] = useState(revisionFormDefaults);
  const [filters, setFilters] = useState<RevisionFilter>(filterDefaults);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const queryPrefilled = useRef(false);

  const filteredChapters = useMemo(
    () => syllabus.chapters.filter((chapter) => chapter.subjectId === form.subjectId),
    [form.subjectId, syllabus.chapters]
  );
  const filteredTopics = useMemo(
    () => syllabus.topics.filter((topic) => topic.chapterId === form.chapterId),
    [form.chapterId, syllabus.topics]
  );

  const activeCount = revisions.plans.filter(isRevisionActive).length;
  const revisionUsage = getLimitUsage(activeCount, plan.limits.revisionPlansLimit);
  const revisionLimitReached = revisionUsage.isAtLimit;

  useEffect(() => {
    if (queryPrefilled.current || !dataReady || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const title = params.get("title");
    const mockTestId = params.get("mockTestId");

    if (!title && !mockTestId) {
      return;
    }

    queryPrefilled.current = true;
    const subjectId = params.get("subjectId") ?? "";
    const chapterId = params.get("chapterId") ?? "";
    const topicId = params.get("topicId") ?? "";
    const subject = syllabus.subjects.find((item) => item.id === subjectId);
    const chapter = syllabus.chapters.find((item) => item.id === chapterId);
    const topic = syllabus.topics.find((item) => item.id === topicId);

    setForm((current) => ({
      ...current,
      title: title ?? current.title,
      subjectId,
      subject: params.get("subject") ?? subject?.name ?? current.subject,
      chapterId,
      chapterName: params.get("chapterName") ?? chapter?.name ?? current.chapterName,
      topicId,
      topicName: params.get("topicName") ?? topic?.name ?? current.topicName,
      mockTestId: mockTestId ?? "",
      sourceType: params.get("sourceType") ?? "",
      sourceId: params.get("sourceId") ?? mockTestId ?? "",
      revisionType: (params.get("revisionType") as RevisionType | null) ?? current.revisionType,
      priority: (params.get("priority") as AssignmentPriority | null) ?? current.priority,
      dueDate: params.get("dueDate") ?? current.dueDate,
      notes: params.get("notes") ?? current.notes
    }));
  }, [dataReady, syllabus.chapters, syllabus.subjects, syllabus.topics]);

  const visiblePlans = useMemo(
    () => revisions.plans.filter((revisionPlan) => {
      if (filters.subjectId && revisionPlan.subjectId !== filters.subjectId) {
        return false;
      }

      if (filters.type !== "all" && getRevisionType(revisionPlan) !== filters.type) {
        return false;
      }

      if (filters.status !== "all" && getRevisionStatus(revisionPlan) !== filters.status) {
        return false;
      }

      if (filters.priority !== "all" && getRevisionPriority(revisionPlan) !== filters.priority) {
        return false;
      }

      return true;
    }),
    [filters, revisions.plans]
  );

  const visibleBuckets = useMemo(() => ({
    overdue: visiblePlans.filter((planItem) => isRevisionActive(planItem) && getRevisionDueDate(planItem) < getTodayDateKey()),
    dueToday: visiblePlans.filter((planItem) => isRevisionActive(planItem) && getRevisionDueDate(planItem) === getTodayDateKey()),
    upcoming: visiblePlans.filter((planItem) => isRevisionActive(planItem) && getRevisionDueDate(planItem) > getTodayDateKey()),
    completedToday: revisions.completedToday.filter((planItem) => visiblePlans.some((item) => item.id === planItem.id)),
    finished: visiblePlans.filter((planItem) => getRevisionStatus(planItem) === "Done"),
    skipped: visiblePlans.filter((planItem) => getRevisionStatus(planItem) === "Skipped")
  }), [revisions.completedToday, visiblePlans]);

  if (authLoading || !user) {
    return <LoadingState label="Loading revision planner" />;
  }

  function resetForm() {
    setForm(revisionFormDefaults);
    setEditingId(null);
  }

  function editPlan(planItem: RevisionPlan) {
    setEditingId(planItem.id);
    setForm({
      title: planItem.title,
      subjectId: planItem.subjectId ?? "",
      subject: planItem.subject,
      chapterId: planItem.chapterId ?? "",
      chapterName: planItem.chapterName ?? "",
      topicId: planItem.topicId ?? "",
      topicName: planItem.topicName ?? "",
      mockTestId: planItem.mockTestId ?? "",
      sourceType: planItem.sourceType ?? "",
      sourceId: planItem.sourceId ?? "",
      revisionType: getRevisionType(planItem),
      priority: getRevisionPriority(planItem),
      status: getRevisionStatus(planItem),
      dueDate: getRevisionDueDate(planItem) || getTodayDateKey(),
      notes: planItem.notes ?? ""
    });
    setActionError(null);
    setSuccess(null);
  }

  function selectSubject(subjectId: string) {
    const subject = syllabus.subjects.find((item) => item.id === subjectId);

    setForm({
      ...form,
      subjectId,
      subject: subject?.name ?? "",
      chapterId: "",
      chapterName: "",
      topicId: "",
      topicName: ""
    });
  }

  function selectChapter(chapterId: string) {
    const chapter = syllabus.chapters.find((item) => item.id === chapterId);

    setForm({
      ...form,
      chapterId,
      chapterName: chapter?.name ?? "",
      topicId: "",
      topicName: ""
    });
  }

  function selectTopic(topicId: string) {
    const topic = syllabus.topics.find((item) => item.id === topicId);

    setForm({
      ...form,
      topicId,
      topicName: topic?.name ?? ""
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setActionError(null);
    setSuccess(null);

    try {
      if (editingId) {
        await revisions.savePlan(editingId, form);
        setSuccess("Revision item updated.");
      } else {
        if (revisionLimitReached) {
          throw new Error("Forge Starter includes 10 active revision items. Your existing items are safe, and Forge Pro unlocks unlimited revision planning.");
        }

        await revisions.createPlan(form);
        setSuccess("Revision item added.");
      }

      resetForm();
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : "Could not save revision item.");
    } finally {
      setSaving(false);
    }
  }

  async function runAction(action: () => Promise<void>, message: string) {
    setActionError(null);
    setSuccess(null);

    try {
      await action();
      setSuccess(message);
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : "Revision action failed.");
    }
  }

  async function confirmDeleteRevision(planItem: RevisionPlan) {
    const confirmed = await confirm({
      eyebrow: "Delete revision",
      title: `Delete "${planItem.title}"?`,
      description: "This removes the revision item from your planner and calendar. Linked mock, backlog, topic, and focus records stay untouched.",
      confirmLabel: "Delete revision",
      tone: "danger"
    });

    if (!confirmed) {
      return;
    }

    await runAction(() => revisions.removePlan(planItem.id), "Revision item deleted.");
  }

  return (
    <>
      <Navbar email={user.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Revision planner"
          title="Plan, execute, and clear revision deliberately."
          subtitle="Create manual revision items, connect them to subjects or topics, and see the due work on your dashboard and calendar."
          action={<Link className="btn-secondary" href="/calendar">Open calendar</Link>}
        />

        {revisions.error || syllabus.error ? <StatusMessage tone="error">{revisions.error ?? syllabus.error}</StatusMessage> : null}
        {actionError ? <StatusMessage tone="error">{actionError}</StatusMessage> : null}
        {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}
        {revisionLimitReached ? (
          <LimitReachedNotice
            currentPlan={plan.plan}
            limitLabel="Forge Starter includes 10 active revision items."
            usageLabel={revisionUsage.label}
          />
        ) : null}

        <section className="grid gap-5 md:grid-cols-4">
          <MetricCard label="Due today" value={revisions.dueToday.length} />
          <MetricCard label="Overdue" value={revisions.overdue.length} tone="warning" />
          <MetricCard label="Completed today" value={revisions.completedToday.length} />
          <MetricCard label="Active items" value={activeCount} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[25rem_1fr]">
          <form className="card space-y-5 p-6 sm:p-8" id="revision-form" onSubmit={handleSubmit}>
            <SectionHeader
              eyebrow={editingId ? "Edit revision" : "Add revision"}
              title="Revision item"
              subtitle={syllabus.subjects.length > 0 ? "Connect the item to your syllabus when possible." : "Add subjects first to keep revision connected."}
            />

            <label className="flex flex-col gap-2">
              <span className="label">Title</span>
              <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Organic reactions" />
            </label>

            {syllabus.subjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-forge-line bg-forge-surfaceAlt/60 p-4">
                <p className="font-bold text-forge-text">No syllabus subjects yet</p>
                <p className="mt-1 text-sm text-forge-muted">Create a subject first so revision stays connected to the planner.</p>
                <Link className="btn-secondary mt-3" href="/subjects">Add subject</Link>
              </div>
            ) : (
              <label className="flex flex-col gap-2">
                <span className="label">Subject</span>
                <select className="input" value={form.subjectId} onChange={(event) => selectSubject(event.target.value)}>
                  <option value="">Choose subject</option>
                  {syllabus.subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </label>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="label">Chapter</span>
                <select className="input" value={form.chapterId} onChange={(event) => selectChapter(event.target.value)} disabled={!form.subjectId || filteredChapters.length === 0}>
                  <option value="">Optional</option>
                  {filteredChapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>{chapter.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="label">Topic</span>
                <select className="input" value={form.topicId} onChange={(event) => selectTopic(event.target.value)} disabled={!form.chapterId || filteredTopics.length === 0}>
                  <option value="">Optional</option>
                  {filteredTopics.map((topic) => (
                    <option key={topic.id} value={topic.id}>{topic.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="label">Type</span>
                <select className="input" value={form.revisionType} onChange={(event) => setForm({ ...form, revisionType: event.target.value as RevisionType })}>
                  {REVISION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="label">Priority</span>
                <select className="input" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as AssignmentPriority })}>
                  {REVISION_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="label">Revision date</span>
                <input className="input" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
              </label>
              <label className="flex flex-col gap-2">
                <span className="label">Status</span>
                <select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as RevisionStatus })}>
                  {REVISION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="label">Notes</span>
              <textarea className="input min-h-28 resize-y" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Formula gaps, examples, common mistakes..." />
            </label>

            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" disabled={saving || (!editingId && syllabus.subjects.length === 0)} type="submit">
                {saving ? "Saving" : editingId ? "Save item" : "Add item"}
              </button>
              {editingId ? (
                <button className="btn-ghost" type="button" onClick={resetForm}>Cancel</button>
              ) : null}
            </div>
          </form>

          <section className="space-y-5">
            <section className="card p-5">
              <div className="grid gap-4 md:grid-cols-4">
                <FilterSelect label="Subject" value={filters.subjectId} onChange={(value) => setFilters({ ...filters, subjectId: value })}>
                  <option value="">All subjects</option>
                  {syllabus.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                </FilterSelect>
                <FilterSelect label="Type" value={filters.type} onChange={(value) => setFilters({ ...filters, type: value as RevisionFilter["type"] })}>
                  <option value="all">All types</option>
                  {REVISION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </FilterSelect>
                <FilterSelect label="Status" value={filters.status} onChange={(value) => setFilters({ ...filters, status: value as RevisionFilter["status"] })}>
                  <option value="all">All statuses</option>
                  {REVISION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </FilterSelect>
                <FilterSelect label="Priority" value={filters.priority} onChange={(value) => setFilters({ ...filters, priority: value as RevisionFilter["priority"] })}>
                  <option value="all">All priorities</option>
                  {REVISION_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </FilterSelect>
              </div>
              <button className="btn-secondary mt-4" type="button" onClick={() => setFilters(filterDefaults)}>Reset filters</button>
            </section>

            {!dataReady || revisions.loading || syllabus.loading ? (
              <LoadingState label="Loading revisions" mode="inline" />
            ) : revisions.plans.length === 0 ? (
              <EmptyState
                title="No revision items yet"
                description="Add your first manual revision item and it will appear on the calendar when due."
                action={<button className="btn-primary" type="button" onClick={() => document.getElementById("revision-form")?.scrollIntoView({ behavior: "smooth" })}>Add revision</button>}
              />
            ) : visiblePlans.length === 0 ? (
              <EmptyState
                title="No revision items match"
                description="Clear filters to bring your revision plan back into view."
                action={<button className="btn-secondary" type="button" onClick={() => setFilters(filterDefaults)}>Reset filters</button>}
              />
            ) : (
              <>
                <RevisionBucket
                  badge="Attention"
                  empty="No overdue revisions."
                  onComplete={(planItem) => runAction(() => revisions.completePlan(planItem.id), "Revision marked done.")}
                  onDelete={(planItem) => void confirmDeleteRevision(planItem)}
                  onEdit={editPlan}
                  onReopen={(planItem) => runAction(() => revisions.reopenPlan(planItem.id), "Revision reopened.")}
                  onSkip={(planItem) => runAction(() => revisions.skipPlan(planItem.id), "Revision skipped.")}
                  plans={visibleBuckets.overdue}
                  title="Overdue"
                  tone="alert"
                />
                <RevisionBucket
                  badge="Today"
                  empty="Nothing due today."
                  onComplete={(planItem) => runAction(() => revisions.completePlan(planItem.id), "Revision marked done.")}
                  onDelete={(planItem) => void confirmDeleteRevision(planItem)}
                  onEdit={editPlan}
                  onReopen={(planItem) => runAction(() => revisions.reopenPlan(planItem.id), "Revision reopened.")}
                  onSkip={(planItem) => runAction(() => revisions.skipPlan(planItem.id), "Revision skipped.")}
                  plans={visibleBuckets.dueToday}
                  title="Due today"
                />
                <RevisionBucket
                  badge="Next"
                  empty="No upcoming revisions."
                  onComplete={(planItem) => runAction(() => revisions.completePlan(planItem.id), "Revision marked done.")}
                  onDelete={(planItem) => void confirmDeleteRevision(planItem)}
                  onEdit={editPlan}
                  onReopen={(planItem) => runAction(() => revisions.reopenPlan(planItem.id), "Revision reopened.")}
                  onSkip={(planItem) => runAction(() => revisions.skipPlan(planItem.id), "Revision skipped.")}
                  plans={visibleBuckets.upcoming}
                  title="Upcoming"
                />
                <RevisionBucket
                  badge="Done"
                  empty="No completed revisions in this filter."
                  onComplete={(planItem) => runAction(() => revisions.completePlan(planItem.id), "Revision marked done.")}
                  onDelete={(planItem) => void confirmDeleteRevision(planItem)}
                  onEdit={editPlan}
                  onReopen={(planItem) => runAction(() => revisions.reopenPlan(planItem.id), "Revision reopened.")}
                  onSkip={(planItem) => runAction(() => revisions.skipPlan(planItem.id), "Revision skipped.")}
                  plans={visibleBuckets.finished}
                  title="Done"
                />
                {visibleBuckets.skipped.length > 0 ? (
                  <RevisionBucket
                    badge="Skipped"
                    empty=""
                    onComplete={(planItem) => runAction(() => revisions.completePlan(planItem.id), "Revision marked done.")}
                    onDelete={(planItem) => void confirmDeleteRevision(planItem)}
                    onEdit={editPlan}
                    onReopen={(planItem) => runAction(() => revisions.reopenPlan(planItem.id), "Revision reopened.")}
                    onSkip={(planItem) => runAction(() => revisions.skipPlan(planItem.id), "Revision skipped.")}
                    plans={visibleBuckets.skipped}
                    title="Skipped"
                  />
                ) : null}
              </>
            )}
          </section>
        </section>
      </main>
      {confirmDialog}
    </>
  );
}

function FilterSelect({
  label,
  value,
  children,
  onChange
}: {
  label: string;
  value: string;
  children: React.ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="label">{label}</span>
      <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function RevisionBucket({
  title,
  badge,
  plans,
  empty,
  tone,
  onEdit,
  onComplete,
  onSkip,
  onReopen,
  onDelete
}: {
  title: string;
  badge: string;
  plans: RevisionPlan[];
  empty: string;
  tone?: "alert";
  onEdit: (plan: RevisionPlan) => void;
  onComplete: (plan: RevisionPlan) => void;
  onSkip: (plan: RevisionPlan) => void;
  onReopen: (plan: RevisionPlan) => void;
  onDelete: (plan: RevisionPlan) => void;
}) {
  return (
    <section className={tone === "alert" ? "card border-red-200 p-6" : "card p-6"}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-forge-text">{title}</h2>
        <span className={tone === "alert" ? "badge border-red-200 bg-red-50 text-red-700" : "badge badge-open"}>{badge}</span>
      </div>
      <div className="mt-4 space-y-3">
        {plans.length === 0 ? (
          <p className="text-base text-forge-muted">{empty}</p>
        ) : (
          plans.map((plan) => (
            <RevisionCard
              key={plan.id}
              onComplete={onComplete}
              onDelete={onDelete}
              onEdit={onEdit}
              onReopen={onReopen}
              onSkip={onSkip}
              plan={plan}
            />
          ))
        )}
      </div>
    </section>
  );
}

function RevisionCard({
  plan,
  onEdit,
  onComplete,
  onSkip,
  onReopen,
  onDelete
}: {
  plan: RevisionPlan;
  onEdit: (plan: RevisionPlan) => void;
  onComplete: (plan: RevisionPlan) => void;
  onSkip: (plan: RevisionPlan) => void;
  onReopen: (plan: RevisionPlan) => void;
  onDelete: (plan: RevisionPlan) => void;
}) {
  const dueDate = getRevisionDueDate(plan);
  const status = getRevisionStatus(plan);
  const topicLabel = getRevisionTopicLabel(plan);

  return (
    <article className="rounded-3xl border border-forge-line bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="badge">{getRevisionType(plan)}</span>
            <span className={getRevisionPriority(plan) === "High" ? "badge badge-warning" : "badge"}>{getRevisionPriority(plan)}</span>
            <span className={status === "Done" ? "badge badge-done" : status === "Skipped" ? "badge" : "badge badge-open"}>{status}</span>
          </div>
          <h3 className="mt-3 text-base font-bold text-forge-text">{plan.title}</h3>
          <p className="mt-1 text-base text-forge-muted">{plan.subject || "No subject"}</p>
          {topicLabel ? <p className="mt-1 text-sm font-semibold text-forge-muted">{topicLabel}</p> : null}
          <p className="mt-2 text-sm font-bold text-forge-muted">
            {dueDate ? formatLongDate(dueDate) : "Not scheduled"} / Cycle {plan.revisionCount}
          </p>
          {plan.notes ? <p className="mt-2 text-base leading-7 text-forge-muted">{plan.notes}</p> : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {status !== "Done" ? (
          <button className="btn-primary" type="button" onClick={() => onComplete(plan)}>Mark done</button>
        ) : null}
        {status === "Pending" ? (
          <button className="btn-ghost" type="button" onClick={() => onSkip(plan)}>Skip</button>
        ) : null}
        {status !== "Pending" ? (
          <button className="btn-secondary" type="button" onClick={() => onReopen(plan)}>Reopen</button>
        ) : null}
        <button className="btn-ghost" type="button" onClick={() => onEdit(plan)}>Edit</button>
        <button className="btn-danger" type="button" onClick={() => onDelete(plan)}>Delete</button>
      </div>
    </article>
  );
}

export default function RevisionPage() {
  return (
    <AuthGuard>
      <RevisionContent />
    </AuthGuard>
  );
}
