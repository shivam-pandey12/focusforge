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
import { useAssignments } from "@/hooks/useAssignments";
import { useAuth } from "@/hooks/useAuth";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useDeferredDataStart } from "@/hooks/useDeferredDataStart";
import { useSyllabus } from "@/hooks/useSyllabus";
import { formatDuration, formatLongDate, getTodayDateKey } from "@/lib/date";
import type { AssignmentPriority, AssignmentStatus, StudyAssignment } from "@/types";

const priorities: AssignmentPriority[] = ["Low", "Medium", "High"];
const statuses: AssignmentStatus[] = ["Pending", "In Progress", "Completed"];

const defaultForm = {
  title: "",
  subjectId: "",
  subject: "",
  dueDate: getTodayDateKey(),
  priority: "Medium" as AssignmentPriority,
  status: "Pending" as AssignmentStatus,
  estimatedMinutes: "",
  notes: ""
};

function HomeworkContent() {
  const { user, loading: authLoading } = useAuth();
  const dataReady = useDeferredDataStart();
  const syllabus = useSyllabus(dataReady ? user?.uid : undefined);
  const assignments = useAssignments(dataReady ? user?.uid : undefined);
  const { confirm, confirmDialog } = useConfirmDialog();
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const selectedSubject = syllabus.subjects.find((subject) => subject.id === form.subjectId);
  const filteredAssignments = useMemo(() => {
    return assignments.assignments.filter((assignment) => {
      const matchesStatus = statusFilter ? assignment.status === statusFilter : true;
      const matchesPriority = priorityFilter ? assignment.priority === priorityFilter : true;
      const matchesSubject = subjectFilter ? assignment.subjectId === subjectFilter || assignment.subject === subjectFilter : true;

      return matchesStatus && matchesPriority && matchesSubject;
    });
  }, [assignments.assignments, priorityFilter, statusFilter, subjectFilter]);
  const completedCount = assignments.assignments.filter((assignment) => assignment.status === "Completed").length;

  if (authLoading || !user) {
    return <LoadingState label="Loading homework" />;
  }

  function resetForm() {
    setForm(defaultForm);
    setEditingId(null);
  }

  function editAssignment(assignment: StudyAssignment) {
    setEditingId(assignment.id);
    setForm({
      title: assignment.title,
      subjectId: assignment.subjectId ?? "",
      subject: assignment.subject,
      dueDate: assignment.dueDate || getTodayDateKey(),
      priority: assignment.priority,
      status: assignment.status,
      estimatedMinutes: assignment.estimatedMinutes ? String(assignment.estimatedMinutes) : "",
      notes: assignment.notes ?? ""
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

      if (!subjectName) {
        throw new Error("Choose a subject first.");
      }

      const input = {
        title: form.title,
        subjectId: selectedSubject?.id ?? form.subjectId,
        subject: subjectName,
        dueDate: form.dueDate,
        priority: form.priority,
        status: form.status,
        estimatedMinutes: form.estimatedMinutes,
        notes: form.notes
      };

      if (editingId) {
        await assignments.saveAssignment(editingId, input);
        setSuccess("Homework updated.");
      } else {
        await assignments.createAssignment(input);
        setSuccess("Homework added.");
      }

      resetForm();
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : "Could not save homework.");
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
      setActionError(currentError instanceof Error ? currentError.message : "Homework action failed.");
    }
  }

  async function handleDelete(assignment: StudyAssignment) {
    const confirmed = await confirm({
      eyebrow: "Delete homework",
      title: `Delete "${assignment.title}"?`,
      description: "This homework entry will be removed from lists, calendar, and dashboard summaries.",
      confirmLabel: "Delete homework",
      tone: "danger"
    });

    if (!confirmed) {
      return;
    }

    await runAction(() => assignments.removeAssignment(assignment.id), "Homework deleted.");
    if (editingId === assignment.id) {
      resetForm();
    }
  }

  return (
    <>
      <Navbar email={user.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Homework"
          title="Track assignments before they become stress."
          subtitle="Keep due dates, priorities, and completion state separate from today's focus-session tasks."
          action={<a className="btn-primary" href="#homework-form">Add homework</a>}
        />

        {assignments.error || syllabus.error ? <StatusMessage tone="error">{assignments.error ?? syllabus.error}</StatusMessage> : null}
        {actionError ? <StatusMessage tone="error">{actionError}</StatusMessage> : null}
        {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}

        <section className="grid gap-5 md:grid-cols-4">
          <MetricCard label="Pending" value={assignments.pendingAssignments.length} detail="Open homework" tone="gold" />
          <MetricCard label="Overdue" value={assignments.overdueAssignments.length} detail="Past due and not completed" tone={assignments.overdueAssignments.length > 0 ? "warning" : "default"} />
          <MetricCard label="Upcoming" value={assignments.upcomingAssignments.slice(0, 5).length} detail="Next items visible" />
          <MetricCard label="Completed" value={completedCount} detail="Finished assignments" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[25rem_1fr]">
          <form id="homework-form" className="card space-y-5 p-6 sm:p-8" onSubmit={handleSubmit}>
            <div>
              <p className="eyebrow">{editingId ? "Edit homework" : "Add homework"}</p>
              <h2 className="section-title">Assignment</h2>
            </div>
            <label className="grid gap-2">
              <span className="label">Title</span>
              <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Math worksheet" required />
            </label>
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
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="label">Due date</span>
                <input className="input" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} required />
              </label>
              <label className="grid gap-2">
                <span className="label">Estimated time optional</span>
                <input className="input" min="1" type="number" value={form.estimatedMinutes} onChange={(event) => setForm({ ...form, estimatedMinutes: event.target.value })} placeholder="45" />
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
                <select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AssignmentStatus })}>
                  {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
            </div>
            <label className="grid gap-2">
              <span className="label">Notes optional</span>
              <textarea className="input min-h-28 resize-y" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Submission details or instructions" />
            </label>
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" disabled={saving} type="submit">{saving ? "Saving" : editingId ? "Save homework" : "Add homework"}</button>
              {editingId ? <button className="btn-ghost" type="button" onClick={resetForm}>Cancel</button> : null}
            </div>
          </form>

          <section className="space-y-5">
            <div className="card p-6">
              <div className="grid gap-3 md:grid-cols-3">
                <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="">All statuses</option>
                  {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
                <select className="input" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                  <option value="">All priorities</option>
                  {priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </select>
                <select className="input" value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
                  <option value="">All subjects</option>
                  {syllabus.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                </select>
              </div>
            </div>

            {!dataReady || assignments.loading || syllabus.loading ? (
              <LoadingState label="Loading homework" mode="inline" />
            ) : assignments.assignments.length === 0 ? (
              <EmptyState title="No homework yet" description="Add the first assignment and FocusForge will track pending, overdue, and upcoming work." action={<a className="btn-primary" href="#homework-form">Add homework</a>} />
            ) : filteredAssignments.length === 0 ? (
              <EmptyState title="No homework matches" description="Clear one filter to bring assignments back into view." />
            ) : (
              <div className="space-y-3">
                {filteredAssignments.map((assignment) => (
                  <AssignmentCard
                    assignment={assignment}
                    key={assignment.id}
                    onComplete={(item) => runAction(() => assignments.completeAssignment(item.id), "Homework completed.")}
                    onDelete={handleDelete}
                    onEdit={editAssignment}
                    onReopen={(item) => runAction(() => assignments.reopenAssignment(item.id), "Homework reopened.")}
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

function AssignmentCard({
  assignment,
  onEdit,
  onDelete,
  onComplete,
  onReopen
}: {
  assignment: StudyAssignment;
  onEdit: (assignment: StudyAssignment) => void;
  onDelete: (assignment: StudyAssignment) => void;
  onComplete: (assignment: StudyAssignment) => void;
  onReopen: (assignment: StudyAssignment) => void;
}) {
  const overdue = assignment.status !== "Completed" && assignment.dueDate < getTodayDateKey();

  return (
    <article className={overdue ? "card border-red-200 p-6" : "card p-6"}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-forge-text">{assignment.title}</h3>
            {overdue ? <span className="badge border-red-200 bg-red-50 text-red-700">Overdue</span> : null}
          </div>
          <p className="mt-2 text-base text-forge-muted">
            {assignment.subject} / Due {formatLongDate(assignment.dueDate)}
          </p>
          <p className="mt-1 text-sm font-bold text-forge-gold">
            {assignment.priority} priority / {assignment.status}
            {assignment.estimatedMinutes ? ` / ${formatDuration(assignment.estimatedMinutes)}` : ""}
          </p>
        </div>
        <span className={assignment.status === "Completed" ? "badge badge-done" : "badge badge-open"}>{assignment.status}</span>
      </div>
      {assignment.notes ? <p className="mt-4 text-base leading-7 text-forge-muted">{assignment.notes}</p> : null}
      <div className="mt-5 flex flex-wrap gap-2">
        {assignment.status === "Completed" ? (
          <button className="btn-secondary" type="button" onClick={() => onReopen(assignment)}>Reopen</button>
        ) : (
          <button className="btn-primary" type="button" onClick={() => onComplete(assignment)}>Complete</button>
        )}
        <button className="btn-ghost" type="button" onClick={() => onEdit(assignment)}>Edit</button>
        <button className="btn-ghost" type="button" onClick={() => onDelete(assignment)}>Delete</button>
      </div>
    </article>
  );
}

export default function HomeworkPage() {
  return (
    <AuthGuard>
      <HomeworkContent />
    </AuthGuard>
  );
}
