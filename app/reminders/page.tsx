"use client";

import { useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/LoadingState";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import StatusMessage from "@/components/StatusMessage";
import { useAssignments } from "@/hooks/useAssignments";
import { useAuth } from "@/hooks/useAuth";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useExamSchedules } from "@/hooks/useExamSchedules";
import { useReminders } from "@/hooks/useReminders";
import { useRevisions } from "@/hooks/useRevisions";
import { useSyllabus } from "@/hooks/useSyllabus";
import { getTodayDateKey } from "@/lib/date";
import type { StudyReminder, StudyReminderStatus, StudyReminderType } from "@/types";

const REMINDER_TYPES: { value: StudyReminderType; label: string }[] = [
  { value: "revision", label: "Revision" },
  { value: "homework", label: "Homework" },
  { value: "exam", label: "Exam" },
  { value: "general-study", label: "General Study" },
  { value: "daily-study", label: "Daily study" },
  { value: "task", label: "Task" },
  { value: "habit", label: "Habit" },
  { value: "goal", label: "Goal" }
];

const REMINDER_STATUSES: StudyReminderStatus[] = ["Active", "Done", "Dismissed"];

const formDefaults = {
  type: "revision" as StudyReminderType,
  title: "",
  message: "",
  date: getTodayDateKey(),
  time: "18:00",
  subjectId: "",
  subject: "",
  linkedRevisionId: "",
  linkedAssignmentId: "",
  linkedExamId: "",
  notes: "",
  status: "Active" as StudyReminderStatus
};

function RemindersContent() {
  const { user } = useAuth();
  const reminders = useReminders(user?.uid);
  const syllabus = useSyllabus(user?.uid);
  const revisions = useRevisions(user?.uid);
  const assignments = useAssignments(user?.uid);
  const exams = useExamSchedules(user?.uid);
  const { confirm, confirmDialog } = useConfirmDialog();
  const [form, setForm] = useState(formDefaults);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeCount = useMemo(
    () => reminders.reminders.filter((reminder) => reminder.status !== "Done" && reminder.status !== "Dismissed" && !reminder.read).length,
    [reminders.reminders]
  );

  function resetForm() {
    setForm(formDefaults);
    setEditingId(null);
  }

  function selectSubject(subjectId: string) {
    const subject = syllabus.subjects.find((item) => item.id === subjectId);

    setForm({ ...form, subjectId, subject: subject?.name ?? "" });
  }

  function editReminder(reminder: StudyReminder) {
    if (reminder.id.startsWith("virtual-")) {
      return;
    }

    setEditingId(reminder.id);
    setForm({
      type: reminder.type,
      title: reminder.title,
      message: reminder.message,
      date: reminder.date || getTodayDateKey(),
      time: reminder.time ?? "",
      subjectId: reminder.subjectId ?? "",
      subject: reminder.subject ?? "",
      linkedRevisionId: reminder.linkedRevisionId ?? "",
      linkedAssignmentId: reminder.linkedAssignmentId ?? "",
      linkedExamId: reminder.linkedExamId ?? "",
      notes: reminder.notes ?? "",
      status: reminder.status ?? (reminder.read ? "Dismissed" : "Active")
    });
    setError(null);
    setMessage(null);
  }

  async function submitReminder() {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      if (editingId) {
        await reminders.saveReminder(editingId, form);
        setMessage("Reminder updated.");
      } else {
        await reminders.createReminder(form);
        setMessage("Reminder created.");
      }

      resetForm();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not save reminder.");
    } finally {
      setSaving(false);
    }
  }

  async function runAction(action: () => Promise<void>, success: string) {
    setError(null);
    setMessage(null);

    try {
      await action();
      setMessage(success);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not update reminder.");
    }
  }

  async function confirmDeleteReminder(reminder: StudyReminder) {
    const confirmed = await confirm({
      eyebrow: "Delete reminder",
      title: `Delete "${reminder.title}"?`,
      description: "This removes the in-app reminder only. Linked homework, revision, exam, or study records stay untouched.",
      confirmLabel: "Delete reminder",
      tone: "danger"
    });

    if (!confirmed) {
      return;
    }

    await runAction(() => reminders.removeReminder(reminder.id), "Reminder deleted.");
  }

  async function requestPermission() {
    const permission = await reminders.requestBrowserPermission();
    setMessage(permission === "granted" ? "Browser reminders allowed." : "Browser reminders are not enabled. In-app reminders still work.");
  }

  return (
    <>
      <Navbar email={user?.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Reminders"
          title="Keep study promises visible."
          subtitle="Create in-app reminders for revision, homework, exams, or general study. Notifications can be layered in later."
          action={<button className="btn-secondary" type="button" onClick={requestPermission}>Browser permission</button>}
        />

        {reminders.error || syllabus.error || revisions.error || assignments.error || exams.error || error ? (
          <StatusMessage tone="error">{error ?? reminders.error ?? syllabus.error ?? revisions.error ?? assignments.error ?? exams.error}</StatusMessage>
        ) : null}
        {message ? <StatusMessage tone="success">{message}</StatusMessage> : null}

        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="card p-6">
            <SectionHeader
              title={editingId ? "Edit reminder" : "Create reminder"}
              subtitle={`Browser status: ${reminders.notificationPermission}`}
            />
            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="label">Type</span>
                  <select className="input" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as StudyReminderType })}>
                    {REMINDER_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="label">Status</span>
                  <select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as StudyReminderStatus })}>
                    {REMINDER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
              </div>
              <label className="grid gap-2">
                <span className="label">Title</span>
                <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Evening revision" />
              </label>
              <label className="grid gap-2">
                <span className="label">Message</span>
                <textarea className="input min-h-24" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Revise one topic before dinner." />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="label">Date</span>
                  <input className="input" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
                </label>
                <label className="grid gap-2">
                  <span className="label">Time</span>
                  <input className="input" type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} />
                </label>
              </div>
              <label className="grid gap-2">
                <span className="label">Subject</span>
                <select className="input" value={form.subjectId} onChange={(event) => selectSubject(event.target.value)}>
                  <option value="">Optional</option>
                  {syllabus.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-2">
                  <span className="label">Revision link</span>
                  <select className="input" value={form.linkedRevisionId} onChange={(event) => setForm({ ...form, linkedRevisionId: event.target.value })}>
                    <option value="">Optional</option>
                    {revisions.plans.map((revision) => <option key={revision.id} value={revision.id}>{revision.title}</option>)}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="label">Homework link</span>
                  <select className="input" value={form.linkedAssignmentId} onChange={(event) => setForm({ ...form, linkedAssignmentId: event.target.value })}>
                    <option value="">Optional</option>
                    {assignments.assignments.map((assignment) => <option key={assignment.id} value={assignment.id}>{assignment.title}</option>)}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="label">Exam link</span>
                  <select className="input" value={form.linkedExamId} onChange={(event) => setForm({ ...form, linkedExamId: event.target.value })}>
                    <option value="">Optional</option>
                    {exams.exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name}</option>)}
                  </select>
                </label>
              </div>
              <label className="grid gap-2">
                <span className="label">Notes</span>
                <textarea className="input min-h-20" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Optional internal note." />
              </label>
              <div className="flex flex-wrap gap-3">
                <button className="btn-primary" disabled={saving} type="button" onClick={submitReminder}>
                  {saving ? "Saving" : editingId ? "Save reminder" : "Create reminder"}
                </button>
                {editingId ? <button className="btn-ghost" type="button" onClick={resetForm}>Cancel</button> : null}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <section className="card p-6">
              <SectionHeader title="Due reminders" subtitle={`${activeCount} active reminders`} />
              {reminders.loading ? (
                <div className="mt-4"><LoadingState label="Loading reminders" mode="inline" /></div>
              ) : reminders.dueToday.length === 0 ? (
                <div className="mt-4">
                  <EmptyState title="No reminders due" description="Your reminder center is clear for today." />
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  {reminders.dueToday.map((reminder) => (
                    <ReminderCard
                      key={reminder.id}
                      onDelete={(item) => void confirmDeleteReminder(item)}
                      onDismiss={(item) => runAction(() => reminders.dismissReminder(item.id), "Reminder dismissed.")}
                      onDone={(item) => runAction(() => reminders.markDone(item.id), "Reminder marked done.")}
                      onEdit={editReminder}
                      onReopen={(item) => runAction(() => reminders.reopenReminder(item.id), "Reminder reopened.")}
                      reminder={reminder}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="card p-6">
              <SectionHeader title="All reminders" />
              {reminders.loading ? (
                <div className="mt-4"><LoadingState label="Loading reminder list" mode="inline" /></div>
              ) : reminders.reminders.length === 0 ? (
                <p className="mt-4 text-base text-forge-muted">Create your first reminder when a deadline needs visibility.</p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {reminders.reminders.map((reminder) => (
                    <ReminderCard
                      key={reminder.id}
                      onDelete={(item) => void confirmDeleteReminder(item)}
                      onDismiss={(item) => runAction(() => reminders.dismissReminder(item.id), "Reminder dismissed.")}
                      onDone={(item) => runAction(() => reminders.markDone(item.id), "Reminder marked done.")}
                      onEdit={editReminder}
                      onReopen={(item) => runAction(() => reminders.reopenReminder(item.id), "Reminder reopened.")}
                      reminder={reminder}
                    />
                  ))}
                  {reminders.hasMore ? (
                    <button className="btn-secondary w-full" type="button" onClick={reminders.loadMore}>Load more reminders</button>
                  ) : null}
                </div>
              )}
            </section>
          </div>
        </section>
      </main>
      {confirmDialog}
    </>
  );
}

function ReminderCard({
  reminder,
  onEdit,
  onDone,
  onDismiss,
  onReopen,
  onDelete
}: {
  reminder: StudyReminder;
  onEdit: (reminder: StudyReminder) => void;
  onDone: (reminder: StudyReminder) => void;
  onDismiss: (reminder: StudyReminder) => void;
  onReopen: (reminder: StudyReminder) => void;
  onDelete: (reminder: StudyReminder) => void;
}) {
  const status = reminder.status ?? (reminder.read ? "Dismissed" : "Active");

  return (
    <article className="rounded-2xl border border-forge-line bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="badge">{reminder.type}</span>
            <span className={status === "Active" ? "badge badge-open" : status === "Done" ? "badge badge-done" : "badge"}>{status}</span>
          </div>
          <h3 className="mt-3 text-lg font-bold text-forge-text">{reminder.title}</h3>
          <p className="mt-1 text-base leading-7 text-forge-muted">{reminder.message || reminder.notes || "Reminder ready."}</p>
          <p className="mt-2 text-sm font-bold text-forge-muted">{reminder.date} {reminder.time ?? ""}</p>
          {reminder.subject ? <p className="mt-1 text-sm font-semibold text-forge-muted">{reminder.subject}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {status === "Active" ? (
            <>
              <button className="btn-secondary" type="button" onClick={() => onDone(reminder)}>Done</button>
              <button className="btn-ghost" type="button" onClick={() => onDismiss(reminder)}>Dismiss</button>
            </>
          ) : (
            <button className="btn-secondary" type="button" onClick={() => onReopen(reminder)}>Reopen</button>
          )}
          {!reminder.id.startsWith("virtual-") ? (
            <>
              <button className="btn-ghost" type="button" onClick={() => onEdit(reminder)}>Edit</button>
              <button className="btn-danger" type="button" onClick={() => onDelete(reminder)}>Delete</button>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function RemindersPage() {
  return (
    <AuthGuard>
      <RemindersContent />
    </AuthGuard>
  );
}
