"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import EmptyState from "@/components/EmptyState";
import LimitReachedNotice from "@/components/LimitReachedNotice";
import LoadingState from "@/components/LoadingState";
import MetricCard from "@/components/MetricCard";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import StatusMessage from "@/components/StatusMessage";
import { useAuth } from "@/hooks/useAuth";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useDeferredDataStart } from "@/hooks/useDeferredDataStart";
import { useExamSchedules } from "@/hooks/useExamSchedules";
import { useMarksEntries } from "@/hooks/useMarksEntries";
import { usePlan } from "@/hooks/usePlan";
import { useSyllabus } from "@/hooks/useSyllabus";
import {
  calculateMarksPercentage,
  MARKS_ENTRY_SCOPES,
  MISTAKE_TAGS,
  requiresSubjectForScope,
  type MarksProgressSummary
} from "@/lib/marks";
import { formatDuration, formatLongDate, getTodayDateKey } from "@/lib/date";
import { getLimitUsage } from "@/lib/plans";
import type { ExamSchedule, MarksEntry, MarksEntryScope, MistakeTag } from "@/types";

const defaultForm = {
  testName: "",
  subjectId: "",
  subject: "",
  examScheduleId: "",
  scope: "Subject Test" as MarksEntryScope,
  date: getTodayDateKey(),
  score: "",
  totalMarks: "",
  rank: "",
  percentile: "",
  durationMinutes: "",
  mistakeTags: [] as MistakeTag[],
  mistakeNotes: "",
  notes: ""
};

function dateRangeLabel(range: string): string {
  if (range === "week") {
    return "This week";
  }

  if (range === "month") {
    return "This month";
  }

  return "All results";
}

function trendDetail(trend: string): string {
  if (trend === "Not enough data") {
    return "Record at least two results.";
  }

  return "Based on the latest two results.";
}

function MarksContent() {
  const { user, loading: authLoading } = useAuth();
  const dataReady = useDeferredDataStart();
  const syllabus = useSyllabus(dataReady ? user?.uid : undefined);
  const exams = useExamSchedules(dataReady ? user?.uid : undefined);
  const plan = usePlan(user?.uid);
  const marks = useMarksEntries(dataReady ? user?.uid : undefined, { subjects: syllabus.subjects });
  const { confirm, confirmDialog } = useConfirmDialog();
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const queryPrefilled = useRef(false);
  const selectedSubject = syllabus.subjects.find((subject) => subject.id === form.subjectId);
  const selectedExam = exams.exams.find((exam) => exam.id === form.examScheduleId);
  const subjectRequired = requiresSubjectForScope(form.scope);
  const marksUsage = getLimitUsage(marks.entries.length, plan.limits.marksEntriesLimit);
  const freeSlotsLabel = marksUsage.isLimited ? `${marksUsage.remaining} free slots left` : "Unlimited entries";
  const percentagePreview = useMemo(() => {
    const score = Number(form.score);
    const total = Number(form.totalMarks);

    return Number.isFinite(score) && Number.isFinite(total) && total > 0 ? calculateMarksPercentage(score, total) : 0;
  }, [form.score, form.totalMarks]);
  const limitReached = marksUsage.isAtLimit;

  const prefillFromExam = useCallback((exam: ExamSchedule) => {
    setForm((current) => ({
      ...current,
      testName: exam.name,
      subjectId: exam.fullSyllabus ? "" : exam.subjectId ?? "",
      subject: exam.fullSyllabus ? "" : exam.subject ?? "",
      examScheduleId: exam.id,
      scope: exam.fullSyllabus ? "Full Syllabus" : "Subject Test",
      date: exam.date || getTodayDateKey(),
      totalMarks: exam.totalMarks ? String(exam.totalMarks) : current.totalMarks,
      durationMinutes: exam.durationMinutes ? String(exam.durationMinutes) : current.durationMinutes
    }));
    setActionError(null);
    setSuccess("Exam details loaded. Add the score to save the result.");
  }, []);

  useEffect(() => {
    if (queryPrefilled.current || !dataReady || exams.loading || exams.exams.length === 0 || typeof window === "undefined") {
      return;
    }

    const examScheduleId = new URLSearchParams(window.location.search).get("examScheduleId");
    const exam = exams.exams.find((item) => item.id === examScheduleId);

    if (!exam) {
      return;
    }

    queryPrefilled.current = true;
    prefillFromExam(exam);
  }, [dataReady, exams.exams, exams.loading, prefillFromExam]);

  if (authLoading || !user) {
    return <LoadingState label="Loading marks tracker" />;
  }

  function resetForm() {
    setForm(defaultForm);
    setEditingId(null);
  }

  function editEntry(entry: MarksEntry) {
    setEditingId(entry.id);
    setForm({
      testName: entry.testName,
      subjectId: entry.subjectId ?? "",
      subject: entry.subject ?? "",
      examScheduleId: entry.examScheduleId ?? "",
      scope: entry.scope,
      date: entry.date || getTodayDateKey(),
      score: String(entry.score),
      totalMarks: String(entry.totalMarks),
      rank: entry.rank ? String(entry.rank) : "",
      percentile: entry.percentile ? String(entry.percentile) : "",
      durationMinutes: entry.durationMinutes ? String(entry.durationMinutes) : "",
      mistakeTags: entry.mistakeTags,
      mistakeNotes: entry.mistakeNotes ?? "",
      notes: entry.notes ?? ""
    });
    setActionError(null);
    setSuccess(null);
  }

  function toggleMistakeTag(tag: MistakeTag) {
    setForm((current) => ({
      ...current,
      mistakeTags: current.mistakeTags.includes(tag)
        ? current.mistakeTags.filter((item) => item !== tag)
        : [...current.mistakeTags, tag]
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setActionError(null);
    setSuccess(null);

    try {
      if (!editingId && limitReached) {
        throw new Error("Forge Starter includes 20 marks entries. Your existing results are safe, and Forge Pro unlocks unlimited marks tracking.");
      }

      const input = {
        ...form,
        subjectId: selectedSubject?.id ?? form.subjectId,
        subject: selectedSubject?.name ?? form.subject
      };

      if (editingId) {
        await marks.saveEntry(editingId, input);
        setSuccess("Marks entry updated.");
      } else {
        await marks.createEntry(input);
        setSuccess("Marks entry added.");
      }

      resetForm();
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : "Could not save marks.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry: MarksEntry) {
    const confirmed = await confirm({
      eyebrow: "Delete result",
      title: `Delete "${entry.testName}"?`,
      description: "This removes the marks entry and any linked exam will no longer show a result-added badge.",
      confirmLabel: "Delete result",
      tone: "danger"
    });

    if (!confirmed) {
      return;
    }

    setActionError(null);
    setSuccess(null);

    try {
      await marks.removeEntry(entry.id);
      if (editingId === entry.id) {
        resetForm();
      }
      setSuccess("Marks entry deleted.");
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : "Could not delete marks entry.");
    }
  }

  return (
    <>
      <Navbar email={user.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Marks"
          title="Track scores without mixing them into mock analytics."
          subtitle="Record school tests, coaching tests, full-syllabus results, and practice scores with subject snapshots and mistake tags."
          action={<a className="btn-primary" href="#marks-form">Add result</a>}
        />

        {marks.error || syllabus.error || exams.error ? <StatusMessage tone="error">{marks.error ?? syllabus.error ?? exams.error}</StatusMessage> : null}
        {actionError ? <StatusMessage tone="error">{actionError}</StatusMessage> : null}
        {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}

        <section className="grid gap-5 md:grid-cols-5">
          <MetricCard label="Results" value={marks.summary.totalTests} detail={freeSlotsLabel} tone="gold" />
          <MetricCard label="Average" value={marks.summary.totalTests ? `${marks.summary.overallAverage}%` : "None"} detail="Across all recorded results" />
          <MetricCard label="Best subject" value={marks.summary.bestSubject?.subjectName ?? "No signal"} detail={marks.summary.bestSubject ? `${marks.summary.bestSubject.averagePercentage}% average` : "Needs subject-linked marks"} />
          <MetricCard label="Weak subject" value={marks.summary.weakestSubject?.subjectName ?? "No signal"} detail={marks.summary.weakestSubject ? `${marks.summary.weakestSubject.averagePercentage}% average` : "Needs subject-linked marks"} tone={marks.summary.weakestSubject?.weak ? "warning" : "default"} />
          <MetricCard label="Trend" value={marks.summary.trend} detail={trendDetail(marks.summary.trend)} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[26rem_1fr]">
          <form id="marks-form" className="card space-y-5 p-6 sm:p-8" onSubmit={handleSubmit}>
            <div>
              <p className="eyebrow">{editingId ? "Edit result" : "Add result"}</p>
              <h2 className="section-title">Test score</h2>
            </div>

            <label className="grid gap-2">
              <span className="label">Link exam schedule optional</span>
              <select
                className="input"
                value={form.examScheduleId}
                onChange={(event) => {
                  const exam = exams.exams.find((item) => item.id === event.target.value);
                  if (exam) {
                    prefillFromExam(exam);
                    return;
                  }
                  setForm({ ...form, examScheduleId: "" });
                }}
              >
                <option value="">No linked exam</option>
                {exams.exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name} / {exam.date}
                  </option>
                ))}
              </select>
              {selectedExam ? <span className="text-sm font-semibold text-forge-muted">Linked result badges are derived from this marks entry.</span> : null}
            </label>

            <label className="grid gap-2">
              <span className="label">Test/result name</span>
              <input className="input" value={form.testName} onChange={(event) => setForm({ ...form, testName: event.target.value })} placeholder="Physics chapter test" required />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="label">Scope</span>
                <select
                  className="input"
                  value={form.scope}
                  onChange={(event) => {
                    const nextScope = event.target.value as MarksEntryScope;
                    setForm({
                      ...form,
                      scope: nextScope,
                      ...(requiresSubjectForScope(nextScope) ? {} : { subjectId: form.subjectId, subject: form.subject })
                    });
                  }}
                >
                  {MARKS_ENTRY_SCOPES.map((scope) => <option key={scope} value={scope}>{scope}</option>)}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="label">Date</span>
                <input className="input" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
              </label>
            </div>

            <label className="grid gap-2">
              <span className="label">Subject {subjectRequired ? "" : "optional"}</span>
              <select
                className="input"
                value={form.subjectId}
                onChange={(event) => {
                  const subject = syllabus.subjects.find((item) => item.id === event.target.value);
                  setForm({ ...form, subjectId: event.target.value, subject: subject?.name ?? "" });
                }}
                required={subjectRequired && !form.subject}
              >
                <option value="">{form.subject ? `Legacy: ${form.subject}` : subjectRequired ? "Choose subject" : "No subject / full syllabus"}</option>
                {syllabus.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
              {syllabus.subjects.length === 0 ? <Link className="btn-ghost w-fit" href="/subjects">Create a subject first</Link> : null}
            </label>

            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="grid gap-2">
                <span className="label">Score obtained</span>
                <input className="input" min="0" step="0.5" type="number" value={form.score} onChange={(event) => setForm({ ...form, score: event.target.value })} placeholder="78" required />
              </label>
              <label className="grid gap-2">
                <span className="label">Total marks</span>
                <input className="input" min="1" step="0.5" type="number" value={form.totalMarks} onChange={(event) => setForm({ ...form, totalMarks: event.target.value })} placeholder="100" required />
              </label>
              <div className="rounded-2xl border border-forge-line bg-white px-4 py-3 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-forge-muted">Percent</p>
                <p className="text-xl font-black text-forge-text">{percentagePreview ? `${percentagePreview}%` : "--"}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-2">
                <span className="label">Rank optional</span>
                <input className="input" min="0" type="number" value={form.rank} onChange={(event) => setForm({ ...form, rank: event.target.value })} placeholder="12" />
              </label>
              <label className="grid gap-2">
                <span className="label">Percentile optional</span>
                <input className="input" min="0" max="100" step="0.1" type="number" value={form.percentile} onChange={(event) => setForm({ ...form, percentile: event.target.value })} placeholder="88.5" />
              </label>
              <label className="grid gap-2">
                <span className="label">Duration optional</span>
                <input className="input" min="1" type="number" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} placeholder="120" />
              </label>
            </div>

            <div className="grid gap-3">
              <span className="label">Mistake tags optional</span>
              <div className="flex flex-wrap gap-2">
                {MISTAKE_TAGS.map((tag) => (
                  <button
                    className={form.mistakeTags.includes(tag) ? "badge badge-open" : "badge"}
                    key={tag}
                    type="button"
                    onClick={() => toggleMistakeTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <label className="grid gap-2">
              <span className="label">Mistake notes optional</span>
              <textarea className="input min-h-24 resize-y" value={form.mistakeNotes} onChange={(event) => setForm({ ...form, mistakeNotes: event.target.value })} placeholder="What went wrong?" />
            </label>
            <label className="grid gap-2">
              <span className="label">Notes optional</span>
              <textarea className="input min-h-24 resize-y" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Paper difficulty, next action, or teacher feedback" />
            </label>

            {!editingId && limitReached ? <LimitReachedNotice currentPlan={plan.plan} limitLabel="Forge Starter includes 20 marks entries." usageLabel={marksUsage.label} /> : null}
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" disabled={saving || (!editingId && limitReached)} type="submit">
                {saving ? "Saving" : editingId ? "Save result" : "Add result"}
              </button>
              {editingId ? <button className="btn-ghost" type="button" onClick={resetForm}>Cancel</button> : null}
            </div>
          </form>

          <section className="space-y-5">
            <MarksVisualSummary entries={marks.entries} summary={marks.summary} />

            <div className="card p-5 sm:p-6">
              <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
                <label className="grid gap-2">
                  <span className="label">Subject filter</span>
                  <select className="input" value={marks.subjectFilter} onChange={(event) => marks.setSubjectFilter(event.target.value)}>
                    <option value="">All subjects</option>
                    {syllabus.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="label">Scope filter</span>
                  <select className="input" value={marks.scopeFilter} onChange={(event) => marks.setScopeFilter(event.target.value as "" | MarksEntryScope)}>
                    <option value="">All scopes</option>
                    {MARKS_ENTRY_SCOPES.map((scope) => <option key={scope} value={scope}>{scope}</option>)}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="label">Date range</span>
                  <select className="input" value={marks.dateRangeFilter} onChange={(event) => marks.setDateRangeFilter(event.target.value as "all" | "week" | "month")}>
                    <option value="all">All</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                </label>
                <button className="btn-ghost self-end" type="button" onClick={marks.resetFilters}>Reset</button>
              </div>
            </div>

            {!dataReady || marks.loading || syllabus.loading || exams.loading ? (
              <LoadingState label="Loading marks entries" mode="inline" />
            ) : marks.entries.length === 0 ? (
              <EmptyState title="No marks recorded yet" description="Add your first result to start seeing averages, subject signals, and mistake focus." action={<a className="btn-primary" href="#marks-form">Add result</a>} />
            ) : marks.filteredEntries.length === 0 ? (
              <EmptyState title="No results match the filters" description={`${dateRangeLabel(marks.dateRangeFilter)} has no matching marks entries. Reset filters or add another result.`} action={<button className="btn-secondary" type="button" onClick={marks.resetFilters}>Reset filters</button>} />
            ) : (
              <div className="space-y-3">
                {marks.filteredEntries.map((entry) => (
                  <MarksEntryCard entry={entry} key={entry.id} onDelete={handleDelete} onEdit={editEntry} />
                ))}
                {!marks.subjectFilter && !marks.scopeFilter && marks.dateRangeFilter === "all" && marks.hasMore ? (
                  <button className="btn-secondary w-full" type="button" onClick={marks.loadMore}>Load more results</button>
                ) : null}
              </div>
            )}
          </section>
        </section>
      </main>
      {confirmDialog}
    </>
  );
}

function MarksVisualSummary({
  entries,
  summary
}: {
  entries: MarksEntry[];
  summary: MarksProgressSummary;
}) {
  const recent = summary.recentEntries.slice(0, 8).reverse();
  const subjects = [...summary.subjectSummaries].sort((a, b) => b.averagePercentage - a.averagePercentage).slice(0, 6);
  const mistakes = summary.mistakeTagCounts.slice(0, 6);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <article className="card p-5 sm:p-6">
        <p className="eyebrow">Trend</p>
        <h3 className="mt-2 text-xl font-bold text-forge-text">Percentage over time</h3>
        <div className="mt-5 grid min-h-40 grid-cols-4 items-end gap-2 sm:grid-cols-8">
          {recent.length === 0 ? (
            <p className="col-span-full text-base text-forge-muted">No scores yet.</p>
          ) : (
            recent.map((entry) => (
              <div className="grid gap-2" key={entry.id}>
                <div className="flex h-32 items-end rounded-2xl border border-forge-line bg-white p-1">
                  <span className="w-full rounded-xl bg-forge-gold/80" style={{ height: `${Math.max(6, Math.min(100, entry.percentage))}%` }} />
                </div>
                <p className="truncate text-center text-xs font-bold text-forge-muted">{entry.percentage}%</p>
              </div>
            ))
          )}
        </div>
      </article>

      <article className="card p-5 sm:p-6">
        <p className="eyebrow">Subjects</p>
        <h3 className="mt-2 text-xl font-bold text-forge-text">Subject averages</h3>
        <div className="mt-5 grid gap-3">
          {subjects.length === 0 ? (
            <p className="text-base text-forge-muted">Subject-linked marks will appear here.</p>
          ) : (
            subjects.map((subject) => (
              <div key={subject.subjectId}>
                <div className="flex items-center justify-between gap-3 text-sm font-bold">
                  <span className="truncate text-forge-text">{subject.subjectName}</span>
                  <span className="text-forge-muted">{subject.averagePercentage}%</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-forge-surfaceAlt">
                  <span className="block h-full rounded-full bg-forge-gold" style={{ width: `${Math.min(100, subject.averagePercentage)}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      </article>

      <article className="card p-5 sm:p-6">
        <p className="eyebrow">Mistakes</p>
        <h3 className="mt-2 text-xl font-bold text-forge-text">Mistake focus</h3>
        <div className="mt-5 grid gap-3">
          {mistakes.length === 0 ? (
            <p className="text-base text-forge-muted">Add mistake tags to see patterns.</p>
          ) : (
            mistakes.map((item) => {
              const max = Math.max(...mistakes.map((mistake) => mistake.count));
              return (
                <div key={item.tag}>
                  <div className="flex items-center justify-between gap-3 text-sm font-bold">
                    <span className="truncate text-forge-text">{item.tag}</span>
                    <span className="text-forge-muted">{item.count}</span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-forge-surfaceAlt">
                    <span className="block h-full rounded-full bg-forge-gold" style={{ width: `${Math.max(8, (item.count / max) * 100)}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
        <p className="mt-5 text-sm font-semibold text-forge-muted">{entries.length} total result{entries.length === 1 ? "" : "s"} recorded.</p>
      </article>
    </div>
  );
}

function MarksEntryCard({
  entry,
  onEdit,
  onDelete
}: {
  entry: MarksEntry;
  onEdit: (entry: MarksEntry) => void;
  onDelete: (entry: MarksEntry) => void;
}) {
  return (
    <article className="card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-forge-text">{entry.testName}</h3>
            <span className="badge badge-open">{entry.percentage}%</span>
            {entry.examScheduleId ? <span className="badge badge-done">Result added</span> : null}
          </div>
          <p className="mt-2 text-base text-forge-muted">
            {formatLongDate(entry.date)} / {entry.scope} / {entry.subject ?? "Full syllabus"}
          </p>
          <p className="mt-1 text-sm font-bold text-forge-gold">
            {entry.score}/{entry.totalMarks} marks
            {entry.durationMinutes ? ` / ${formatDuration(entry.durationMinutes)}` : ""}
            {entry.rank ? ` / Rank ${entry.rank}` : ""}
            {entry.percentile ? ` / ${entry.percentile} percentile` : ""}
          </p>
        </div>
        <span className={entry.percentage >= 75 ? "badge badge-done" : entry.percentage < 50 ? "badge badge-open" : "badge"}>
          {entry.percentage >= 75 ? "Strong" : entry.percentage < 50 ? "Needs work" : "Steady"}
        </span>
      </div>
      {entry.mistakeTags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {entry.mistakeTags.map((tag) => <span className="badge" key={tag}>{tag}</span>)}
        </div>
      ) : null}
      {entry.mistakeNotes ? <p className="mt-4 text-base leading-7 text-forge-muted">{entry.mistakeNotes}</p> : null}
      {entry.notes ? <p className="mt-3 text-base leading-7 text-forge-muted">{entry.notes}</p> : null}
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="btn-ghost" type="button" onClick={() => onEdit(entry)}>Edit</button>
        <button className="btn-ghost" type="button" onClick={() => onDelete(entry)}>Delete</button>
      </div>
    </article>
  );
}

export default function MarksPage() {
  return (
    <AuthGuard>
      <MarksContent />
    </AuthGuard>
  );
}
