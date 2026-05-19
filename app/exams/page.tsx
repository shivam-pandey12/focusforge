"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import EmptyState from "@/components/EmptyState";
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
import { useSyllabus } from "@/hooks/useSyllabus";
import { formatDuration, formatLongDate, getTodayDateKey, parseDateKey } from "@/lib/date";
import type { ExamSchedule, MarksEntry } from "@/types";

const defaultForm = {
  name: "",
  subjectId: "",
  subject: "",
  fullSyllabus: false,
  date: getTodayDateKey(),
  startTime: "",
  durationMinutes: "",
  totalMarks: "",
  syllabusNotes: "",
  notes: ""
};

function getDaysLeft(dateKey: string): number {
  const today = parseDateKey(getTodayDateKey());
  const target = parseDateKey(dateKey);
  const diff = target.getTime() - today.getTime();

  return Math.round(diff / 86400000);
}

function formatCountdown(dateKey: string): string {
  const days = getDaysLeft(dateKey);

  if (days === 0) {
    return "Today";
  }

  if (days === 1) {
    return "Tomorrow";
  }

  if (days > 1) {
    return `${days} days left`;
  }

  return `${Math.abs(days)} days ago`;
}

function ExamsContent() {
  const { user, loading: authLoading } = useAuth();
  const dataReady = useDeferredDataStart();
  const syllabus = useSyllabus(dataReady ? user?.uid : undefined);
  const exams = useExamSchedules(dataReady ? user?.uid : undefined);
  const marks = useMarksEntries(dataReady ? user?.uid : undefined);
  const { confirm, confirmDialog } = useConfirmDialog();
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<"upcoming" | "past">("upcoming");
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const selectedSubject = syllabus.subjects.find((subject) => subject.id === form.subjectId);
  const visibleExams = view === "upcoming" ? exams.upcomingExams : exams.pastExams;
  const subjectCount = useMemo(() => {
    return new Set(exams.exams.map((exam) => exam.fullSyllabus ? "Full syllabus" : exam.subject).filter(Boolean)).size;
  }, [exams.exams]);
  const marksByExamId = useMemo(() => {
    const mapped = new Map<string, MarksEntry>();

    marks.entries.forEach((entry) => {
      if (entry.examScheduleId && !mapped.has(entry.examScheduleId)) {
        mapped.set(entry.examScheduleId, entry);
      }
    });

    return mapped;
  }, [marks.entries]);

  if (authLoading || !user) {
    return <LoadingState label="Loading exams" />;
  }

  function resetForm() {
    setForm(defaultForm);
    setEditingId(null);
  }

  function editExam(exam: ExamSchedule) {
    setEditingId(exam.id);
    setForm({
      name: exam.name,
      subjectId: exam.subjectId ?? "",
      subject: exam.subject ?? "",
      fullSyllabus: exam.fullSyllabus,
      date: exam.date || getTodayDateKey(),
      startTime: exam.startTime ?? "",
      durationMinutes: exam.durationMinutes ? String(exam.durationMinutes) : "",
      totalMarks: exam.totalMarks ? String(exam.totalMarks) : "",
      syllabusNotes: exam.syllabusNotes ?? "",
      notes: exam.notes ?? ""
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
      const subjectName = selectedSubject?.name ?? form.subject.trim();
      const input = {
        name: form.name,
        subjectId: form.fullSyllabus ? "" : selectedSubject?.id ?? form.subjectId,
        subject: form.fullSyllabus ? "" : subjectName,
        fullSyllabus: form.fullSyllabus,
        date: form.date,
        startTime: form.startTime,
        durationMinutes: form.durationMinutes,
        totalMarks: form.totalMarks,
        syllabusNotes: form.syllabusNotes,
        notes: form.notes
      };

      if (editingId) {
        await exams.saveExam(editingId, input);
        setSuccess("Exam updated.");
      } else {
        await exams.createExam(input);
        setSuccess("Exam added.");
      }

      resetForm();
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : "Could not save exam.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(exam: ExamSchedule) {
    const confirmed = await confirm({
      eyebrow: "Delete exam",
      title: `Delete "${exam.name}"?`,
      description: "This removes the exam schedule only. Linked marks entries remain separate and safe.",
      confirmLabel: "Delete exam",
      tone: "danger"
    });

    if (!confirmed) {
      return;
    }

    setActionError(null);
    setSuccess(null);

    try {
      await exams.removeExam(exam.id);
      if (editingId === exam.id) {
        resetForm();
      }
      setSuccess("Exam deleted.");
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : "Could not delete exam.");
    }
  }

  return (
    <>
      <Navbar email={user.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Exams"
          title="Keep upcoming tests visible."
          subtitle="Schedule exams and tests without mixing them into mock-result analytics."
          action={<a className="btn-primary" href="#exam-form">Add exam</a>}
        />

        {exams.error || syllabus.error || marks.error ? <StatusMessage tone="error">{exams.error ?? syllabus.error ?? marks.error}</StatusMessage> : null}
        {actionError ? <StatusMessage tone="error">{actionError}</StatusMessage> : null}
        {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}

        <section className="grid gap-5 md:grid-cols-4">
          <MetricCard label="Upcoming" value={exams.upcomingExams.length} detail="Scheduled from today" tone="gold" />
          <MetricCard label="Nearest" value={exams.nearestExam ? formatCountdown(exams.nearestExam.date) : "None"} detail={exams.nearestExam?.name ?? "Add your first exam"} />
          <MetricCard label="Past" value={exams.pastExams.length} detail="Kept separately" />
          <MetricCard label="Coverage" value={subjectCount} detail="Subjects or full syllabus" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[25rem_1fr]">
          <form id="exam-form" className="card space-y-5 p-6 sm:p-8" onSubmit={handleSubmit}>
            <div>
              <p className="eyebrow">{editingId ? "Edit exam" : "Add exam"}</p>
              <h2 className="section-title">Exam details</h2>
            </div>
            <label className="grid gap-2">
              <span className="label">Exam/test name</span>
              <input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Physics unit test" required />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-forge-line bg-white px-5 py-4 text-base font-bold text-forge-text">
              <input checked={form.fullSyllabus} onChange={(event) => setForm({ ...form, fullSyllabus: event.target.checked })} type="checkbox" />
              Full syllabus
            </label>
            {!form.fullSyllabus ? (
              <label className="grid gap-2">
                <span className="label">Subject</span>
                <select className="input" value={form.subjectId} onChange={(event) => {
                  const subject = syllabus.subjects.find((item) => item.id === event.target.value);
                  setForm({ ...form, subjectId: event.target.value, subject: subject?.name ?? form.subject });
                }} required={!form.subject}>
                  <option value="">{form.subject ? `Legacy: ${form.subject}` : "Choose subject"}</option>
                  {syllabus.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                </select>
                {syllabus.subjects.length === 0 ? <Link className="btn-ghost w-fit" href="/subjects">Create a subject first</Link> : null}
              </label>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="label">Date</span>
                <input className="input" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
              </label>
              <label className="grid gap-2">
                <span className="label">Start time optional</span>
                <input className="input" type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="label">Duration optional</span>
                <input className="input" min="1" type="number" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} placeholder="180" />
              </label>
              <label className="grid gap-2">
                <span className="label">Total marks optional</span>
                <input className="input" min="1" type="number" value={form.totalMarks} onChange={(event) => setForm({ ...form, totalMarks: event.target.value })} placeholder="100" />
              </label>
            </div>
            <label className="grid gap-2">
              <span className="label">Syllabus/topics optional</span>
              <textarea className="input min-h-28 resize-y" value={form.syllabusNotes} onChange={(event) => setForm({ ...form, syllabusNotes: event.target.value })} placeholder="Chapters, formulas, topics to revise" />
            </label>
            <label className="grid gap-2">
              <span className="label">Additional notes optional</span>
              <textarea className="input min-h-24 resize-y" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Room, admit card, strategy" />
            </label>
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" disabled={saving} type="submit">{saving ? "Saving" : editingId ? "Save exam" : "Add exam"}</button>
              {editingId ? <button className="btn-ghost" type="button" onClick={resetForm}>Cancel</button> : null}
            </div>
          </form>

          <section className="space-y-5">
            <div className="card p-6">
              <div className="flex rounded-2xl border border-forge-line bg-white p-1.5 shadow-soft">
                {(["upcoming", "past"] as const).map((item) => (
                  <button
                    className={view === item ? "flex-1 rounded-xl bg-forge-surfaceAlt px-5 py-3 text-base font-bold text-forge-text" : "flex-1 px-5 py-3 text-base font-bold text-forge-muted"}
                    key={item}
                    type="button"
                    onClick={() => setView(item)}
                  >
                    {item === "upcoming" ? "Upcoming" : "Past"}
                  </button>
                ))}
              </div>
            </div>

            {!dataReady || exams.loading || syllabus.loading || marks.loading ? (
              <LoadingState label="Loading exams" mode="inline" />
            ) : exams.exams.length === 0 ? (
              <EmptyState title="No exams yet" description="Add your first exam or test and FocusForge will surface the nearest countdown." action={<a className="btn-primary" href="#exam-form">Add exam</a>} />
            ) : visibleExams.length === 0 ? (
              <EmptyState title={view === "upcoming" ? "No upcoming exams" : "No past exams"} description={view === "upcoming" ? "Scheduled exams from today onward will appear here." : "Completed dates move here automatically."} />
            ) : (
              <div className="space-y-3">
                {visibleExams.map((exam) => (
                  <ExamCard exam={exam} key={exam.id} result={marksByExamId.get(exam.id) ?? null} onDelete={handleDelete} onEdit={editExam} />
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

function ExamCard({
  exam,
  result,
  onEdit,
  onDelete
}: {
  exam: ExamSchedule;
  result: MarksEntry | null;
  onEdit: (exam: ExamSchedule) => void;
  onDelete: (exam: ExamSchedule) => void;
}) {
  const daysLeft = getDaysLeft(exam.date);
  const upcoming = daysLeft >= 0;

  return (
    <article className={upcoming && daysLeft <= 3 ? "card border-forge-gold p-6" : "card p-6"}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-forge-text">{exam.name}</h3>
          <p className="mt-2 text-base text-forge-muted">
            {formatLongDate(exam.date)}{exam.startTime ? ` / ${exam.startTime}` : ""} / {exam.fullSyllabus ? "Full syllabus" : exam.subject}
          </p>
          <p className="mt-1 text-sm font-bold text-forge-gold">
            {exam.durationMinutes ? `${formatDuration(exam.durationMinutes)} / ` : ""}
            {exam.totalMarks ? `${exam.totalMarks} marks` : "Marks optional"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <span className={upcoming ? "badge badge-open" : "badge"}>{formatCountdown(exam.date)}</span>
          {result ? <span className="badge badge-done">Result added / {result.percentage}%</span> : null}
        </div>
      </div>
      {exam.syllabusNotes ? <p className="mt-4 text-base leading-7 text-forge-muted">{exam.syllabusNotes}</p> : null}
      {exam.notes ? <p className="mt-3 text-base leading-7 text-forge-muted">{exam.notes}</p> : null}
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="btn-ghost" type="button" onClick={() => onEdit(exam)}>Edit</button>
        {!upcoming && !result ? <Link className="btn-ghost" href={`/marks?examScheduleId=${encodeURIComponent(exam.id)}`}>Add marks</Link> : null}
        {result ? <Link className="btn-ghost" href="/marks">View result</Link> : null}
        <button className="btn-ghost" type="button" onClick={() => onDelete(exam)}>Delete</button>
      </div>
    </article>
  );
}

export default function ExamsPage() {
  return (
    <AuthGuard>
      <ExamsContent />
    </AuthGuard>
  );
}
