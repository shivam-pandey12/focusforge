"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import EmptyState from "@/components/EmptyState";
import LimitReachedNotice from "@/components/LimitReachedNotice";
import LoadingState from "@/components/LoadingState";
import MetricCard from "@/components/MetricCard";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import ProgressBar from "@/components/ProgressBar";
import StatusMessage from "@/components/StatusMessage";
import { useAuth } from "@/hooks/useAuth";
import { useBacklogItems } from "@/hooks/useBacklogItems";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useDeferredDataStart } from "@/hooks/useDeferredDataStart";
import { useMarksEntries } from "@/hooks/useMarksEntries";
import { useMockTests } from "@/hooks/useMockTests";
import { useSyllabus } from "@/hooks/useSyllabus";
import { usePlan } from "@/hooks/usePlan";
import { getLimitUsage } from "@/lib/plans";
import type { SubjectWithProgress } from "@/hooks/useSyllabus";
import type { MockSubjectSummary } from "@/lib/mockAnalytics";
import type { SyllabusSubjectInput } from "@/lib/firebase/firestore";
import type { SubjectMarksSummary } from "@/lib/marks";

const subjectFormDefaults = {
  name: "",
  color: "#C9A46C",
  icon: "",
  targetType: "percentage",
  targetValue: "",
  description: ""
};

const subjectColors = ["#C9A46C", "#7C6F57", "#6E8B7E", "#8A6F9E", "#B66A5D", "#4F7CAC"];

function SubjectsContent() {
  const { user, loading: authLoading } = useAuth();
  const dataReady = useDeferredDataStart();
  const syllabus = useSyllabus(dataReady ? user?.uid : undefined);
  const backlog = useBacklogItems(dataReady ? user?.uid : undefined);
  const marks = useMarksEntries(dataReady ? user?.uid : undefined, { subjects: syllabus.subjects });
  const plan = usePlan(user?.uid);
  const canUseMockAnalytics = plan.hasFeature("mockTests") && plan.hasFeature("advancedMockAnalytics");
  const mockTests = useMockTests(dataReady && canUseMockAnalytics ? user?.uid : undefined);
  const { confirm, confirmDialog } = useConfirmDialog();
  const [form, setForm] = useState(subjectFormDefaults);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const activeSubjectCount = syllabus.subjects.length;
  const subjectUsage = getLimitUsage(activeSubjectCount, plan.limits.subjectsLimit);
  const limitReached = subjectUsage.isAtLimit;
  const targetAverage = useMemo(() => {
    const targets = syllabus.subjects
      .map((subject) => subject.targetValue)
      .filter((value): value is number => Number.isFinite(value ?? Number.NaN));

    return targets.length > 0 ? Math.round(targets.reduce((total, value) => total + value, 0) / targets.length) : 0;
  }, [syllabus.subjects]);
  const performanceBySubject = useMemo(() => {
    return new Map(marks.summary.subjectSummaries.map((summary) => [summary.subjectId, summary]));
  }, [marks.summary.subjectSummaries]);
  const backlogCountBySubject = useMemo(() => {
    const counts = new Map<string, number>();

    backlog.activeItems.forEach((item) => {
      if (item.subjectId) {
        counts.set(item.subjectId, (counts.get(item.subjectId) ?? 0) + 1);
      }
    });

    return counts;
  }, [backlog.activeItems]);
  const weakTopicCountBySubject = useMemo(() => {
    const counts = new Map<string, number>();

    syllabus.topics.forEach((topic) => {
      if (topic.status === "Weak" || topic.status === "Backlog") {
        counts.set(topic.subjectId, (counts.get(topic.subjectId) ?? 0) + 1);
      }
    });

    return counts;
  }, [syllabus.topics]);
  const mockPerformanceBySubject = useMemo(() => {
    const map = new Map<string, MockSubjectSummary>();

    mockTests.summary.subjectSummaries.forEach((summary) => {
      if (summary.subjectId) {
        map.set(summary.subjectId, summary);
      }
    });

    return map;
  }, [mockTests.summary.subjectSummaries]);

  if (authLoading || !user) {
    return <LoadingState label="Loading subjects" />;
  }

  function resetForm() {
    setForm(subjectFormDefaults);
    setEditingId(null);
  }

  function toInput(): SyllabusSubjectInput {
    return {
      name: form.name,
      color: form.color,
      icon: form.icon,
      targetType: form.targetValue.trim() ? (form.targetType as "score" | "percentage") : undefined,
      targetValue: form.targetValue.trim() ? form.targetValue : null,
      description: form.description
    };
  }

  function editSubject(subject: SubjectWithProgress) {
    setEditingId(subject.id);
    setForm({
      name: subject.name,
      color: subject.color ?? "#C9A46C",
      icon: subject.icon ?? "",
      targetType: subject.targetType ?? "percentage",
      targetValue: subject.targetValue ? String(subject.targetValue) : "",
      description: subject.description ?? ""
    });
    setActionError(null);
    setSuccess(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setActionError(null);
    setSuccess(null);

    try {
      if (editingId) {
        await syllabus.saveSubject(editingId, toInput());
        setSuccess("Subject updated.");
      } else {
        if (limitReached) {
          throw new Error("Forge Starter includes 5 subjects. Your existing subjects are safe, and Forge Pro unlocks unlimited subject planning.");
        }

        await syllabus.createSubject(toInput());
        setSuccess("Subject created.");
      }

      resetForm();
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : "Could not save subject.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(subject: SubjectWithProgress) {
    const confirmed = await confirm({
      eyebrow: "Delete subject",
      title: `Delete ${subject.name}?`,
      description: "This also removes its syllabus chapters and topics. Existing snapshots in homework, marks, backlog, and mocks stay readable.",
      confirmLabel: "Delete subject",
      tone: "danger"
    });

    if (!confirmed) {
      return;
    }

    setActionError(null);
    setSuccess(null);

    try {
      await syllabus.removeSubject(subject.id);
      if (editingId === subject.id) {
        resetForm();
      }
      setSuccess("Subject deleted.");
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : "Could not delete subject.");
    }
  }

  return (
    <>
      <Navbar email={user.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Subjects"
          title="Build your study map."
          subtitle="Keep one clean subject source for timetable, homework, exams, and future revision planning."
          action={<a className="btn-primary" href="#subject-form">Add subject</a>}
        />

        {syllabus.error || marks.error || backlog.error || mockTests.error ? <StatusMessage tone="error">{syllabus.error ?? marks.error ?? backlog.error ?? mockTests.error}</StatusMessage> : null}
        {actionError ? <StatusMessage tone="error">{actionError}</StatusMessage> : null}
        {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}

        <section className="grid gap-5 md:grid-cols-3">
          <MetricCard
            label="Active subjects"
            value={activeSubjectCount}
            detail={subjectUsage.isLimited ? `${subjectUsage.remaining} free slots left` : "Unlimited on this plan"}
            tone="gold"
          />
          <MetricCard label="Syllabus progress" value={`${syllabus.overallProgress}%`} detail={`${syllabus.topics.filter((topic) => topic.completed).length}/${syllabus.topics.length} topics complete`} />
          <MetricCard label="Avg target" value={targetAverage ? `${targetAverage}` : "None"} detail="Optional score or percentage goals." />
        </section>

        <section className="grid gap-6 lg:grid-cols-[24rem_1fr]">
          <form id="subject-form" className="card space-y-5 p-6 sm:p-8" onSubmit={handleSubmit}>
            <div>
              <p className="eyebrow">{editingId ? "Edit subject" : "New subject"}</p>
              <h2 className="section-title">Subject details</h2>
            </div>
            <label className="grid gap-2">
              <span className="label">Subject name</span>
              <input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Physics" required />
            </label>
            <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
              <label className="grid gap-2">
                <span className="label">Color</span>
                <div className="grid grid-cols-6 gap-2">
                  {subjectColors.map((color) => (
                    <button
                      aria-label={`Use subject color ${color}`}
                      className={form.color === color ? "h-11 rounded-2xl ring-4 ring-forge-gold/25" : "h-11 rounded-2xl ring-1 ring-forge-line"}
                      key={color}
                      style={{ backgroundColor: color }}
                      type="button"
                      onClick={() => setForm({ ...form, color })}
                    />
                  ))}
                </div>
              </label>
              <label className="grid gap-2">
                <span className="label">Icon</span>
                <input className="input uppercase" maxLength={3} value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} placeholder="PH" />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="label">Target type</span>
                <select className="input" value={form.targetType} onChange={(event) => setForm({ ...form, targetType: event.target.value })}>
                  <option value="percentage">Percentage</option>
                  <option value="score">Score</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="label">Target optional</span>
                <input className="input" min="1" max={form.targetType === "percentage" ? 100 : undefined} type="number" value={form.targetValue} onChange={(event) => setForm({ ...form, targetValue: event.target.value })} placeholder={form.targetType === "percentage" ? "90" : "180"} />
              </label>
            </div>
            <label className="grid gap-2">
              <span className="label">Notes optional</span>
              <textarea className="input min-h-28 resize-y" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Exam board, weak chapters, or teacher notes" />
            </label>
            {!editingId && limitReached ? <LimitReachedNotice currentPlan={plan.plan} limitLabel="Forge Starter includes 5 subjects." usageLabel={subjectUsage.label} /> : null}
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" disabled={saving} type="submit">
                {saving ? "Saving" : editingId ? "Save subject" : "Add subject"}
              </button>
              {editingId ? <button className="btn-ghost" type="button" onClick={resetForm}>Cancel</button> : null}
            </div>
          </form>

          <section>
            {!dataReady || syllabus.loading || marks.loading || backlog.loading || mockTests.loading ? (
              <LoadingState label="Loading subjects" mode="inline" />
            ) : syllabus.subjectsWithProgress.length === 0 ? (
              <EmptyState title="No subjects yet" description="Create your first subject. Timetable, homework, and exams will reuse it." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {syllabus.subjectsWithProgress.map((subject) => (
                  <SubjectCard
                    key={subject.id}
                    backlogCount={backlogCountBySubject.get(subject.id) ?? 0}
                    mockPerformance={mockPerformanceBySubject.get(subject.id) ?? null}
                    performance={performanceBySubject.get(subject.id) ?? null}
                    subject={subject}
                    weakTopicCount={weakTopicCountBySubject.get(subject.id) ?? 0}
                    onDelete={handleDelete}
                    onEdit={editSubject}
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

function SubjectCard({
  subject,
  performance,
  mockPerformance,
  backlogCount,
  weakTopicCount,
  onEdit,
  onDelete
}: {
  subject: SubjectWithProgress;
  performance: SubjectMarksSummary | null;
  mockPerformance: MockSubjectSummary | null;
  backlogCount: number;
  weakTopicCount: number;
  onEdit: (subject: SubjectWithProgress) => void;
  onDelete: (subject: SubjectWithProgress) => void;
}) {
  return (
    <article className="card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black uppercase text-white shadow-soft"
            style={{ backgroundColor: subject.color ?? "#C9A46C" }}
          >
            {subject.icon || subject.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-xl font-bold text-forge-text">{subject.name}</h3>
            <p className="mt-1 text-base text-forge-muted">
              {subject.targetValue ? `Target ${subject.targetValue}${subject.targetType === "percentage" ? "%" : ""}` : "No target set"}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="badge">{subject.chapters.length} chapters</span>
          {performance?.weak ? <span className="badge badge-open">Weak signal</span> : null}
          {backlogCount > 0 ? <span className="badge badge-warning">{backlogCount} backlog</span> : null}
        </div>
      </div>
      {subject.description ? <p className="mt-4 text-base leading-7 text-forge-muted">{subject.description}</p> : null}
      <div className="mt-5">
        <ProgressBar value={subject.progress} label={`${subject.completedTopics}/${subject.totalTopics} topics`} />
      </div>
      {backlogCount > 0 || weakTopicCount > 0 ? (
        <div className="mt-4 rounded-2xl border border-forge-line bg-forge-surfaceAlt/60 p-4">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-forge-muted">Recovery signal</p>
          <p className="mt-2 text-sm font-semibold text-forge-muted">
            {backlogCount} active backlog / {weakTopicCount} weak or backlog topic{weakTopicCount === 1 ? "" : "s"}
          </p>
        </div>
      ) : null}
      {performance ? (
        <div className="mt-5 rounded-2xl border border-forge-line bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-forge-muted">Marks performance</p>
              <p className="mt-1 text-xl font-bold text-forge-text">{performance.averagePercentage}% average</p>
            </div>
            <span className={performance.weak ? "badge badge-open" : "badge badge-done"}>
              {performance.totalTests} result{performance.totalTests === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-forge-surfaceAlt">
            <span className="block h-full rounded-full bg-forge-gold" style={{ width: `${Math.min(100, performance.averagePercentage)}%` }} />
          </div>
          <p className="mt-3 text-sm font-semibold text-forge-muted">
            Latest: {performance.latestEntry?.testName ?? "None"}
            {performance.topMistakeTag ? ` / Focus: ${performance.topMistakeTag}` : ""}
          </p>
        </div>
      ) : null}
      {mockPerformance ? (
        <div className="mt-5 rounded-2xl border border-forge-line bg-[#FFF8EA]/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-forge-muted">Mock signal</p>
              <p className="mt-1 text-xl font-bold text-forge-text">{mockPerformance.averagePercentage}% mock average</p>
            </div>
            <span className={mockPerformance.weak ? "badge badge-warning" : "badge badge-open"}>
              {mockPerformance.tests} mock{mockPerformance.tests === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mt-3 text-sm font-semibold text-forge-muted">{mockPerformance.reason}</p>
          <Link className="btn-ghost mt-3" href="/mock-tests">Open mock reports</Link>
        </div>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="btn-ghost" type="button" onClick={() => onEdit(subject)}>Edit</button>
        <button className="btn-ghost" type="button" onClick={() => onDelete(subject)}>Delete</button>
      </div>
    </article>
  );
}

export default function SubjectsPage() {
  return (
    <AuthGuard>
      <SubjectsContent />
    </AuthGuard>
  );
}
