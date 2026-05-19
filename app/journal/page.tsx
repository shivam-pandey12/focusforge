"use client";

import { FormEvent, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import EmptyState from "@/components/EmptyState";
import FeatureLockedCard from "@/components/FeatureLockedCard";
import LoadingState from "@/components/LoadingState";
import MetricCard from "@/components/MetricCard";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import StatusMessage from "@/components/StatusMessage";
import { useAllTasks } from "@/hooks/useAllTasks";
import { useAuth } from "@/hooks/useAuth";
import { useDeferredDataStart } from "@/hooks/useDeferredDataStart";
import { useJournal } from "@/hooks/useJournal";
import { usePlan } from "@/hooks/usePlan";
import { useUserSessions } from "@/hooks/useUserSessions";
import { formatShortDate, getTodayDateKey } from "@/lib/date";
import type { StudyJournalEntry } from "@/types";

const defaultForm = {
  sessionId: "",
  taskId: "",
  subject: "",
  title: "",
  studiedText: "",
  struggleText: "",
  nextAction: "",
  moodRating: 3,
  focusRating: 3,
  difficultyRating: 3,
  date: getTodayDateKey()
};

function JournalContent() {
  const { user, loading: authLoading } = useAuth();
  const dataReady = useDeferredDataStart();
  const plan = usePlan(dataReady ? user?.uid : undefined);
  const hasAccess = plan.hasFeature("journal");
  const journal = useJournal(dataReady && hasAccess ? user?.uid : undefined);
  const sessions = useUserSessions(dataReady && hasAccess ? user?.uid : undefined);
  const tasks = useAllTasks(dataReady && hasAccess ? user?.uid : undefined);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const todayEntries = journal.entries.filter((entry) => entry.date === getTodayDateKey()).length;
  const averageFocus = journal.entries.length > 0
    ? Math.round((journal.entries.reduce((total, entry) => total + entry.focusRating, 0) / journal.entries.length) * 10) / 10
    : 0;

  if (authLoading || !user) {
    return <LoadingState label="Loading journal" />;
  }

  if (!plan.ready || plan.loading) {
    return (
      <>
        <Navbar email={user.email} />
        <main className="page-shell">
          <LoadingState label="Checking plan access" mode="inline" />
        </main>
      </>
    );
  }

  if (!hasAccess) {
    return (
      <>
        <Navbar email={user.email} />
        <main className="page-shell">
          <FeatureLockedCard
            feature="journal"
            description="Study journal is part of Forge Elite. Existing reflections stay safe and can be unlocked again when you upgrade."
          />
        </main>
      </>
    );
  }

  function resetForm() {
    setForm(defaultForm);
    setEditingId(null);
  }

  function editEntry(entry: StudyJournalEntry) {
    setEditingId(entry.id);
    setForm({
      sessionId: entry.sessionId ?? "",
      taskId: entry.taskId ?? "",
      subject: entry.subject ?? "",
      title: entry.title,
      studiedText: entry.studiedText,
      struggleText: entry.struggleText,
      nextAction: entry.nextAction,
      moodRating: entry.moodRating,
      focusRating: entry.focusRating,
      difficultyRating: entry.difficultyRating,
      date: entry.date
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
        await journal.saveEntry(editingId, form);
        setSuccess("Journal entry updated.");
      } else {
        await journal.createEntry(form);
        setSuccess("Journal entry added.");
      }

      resetForm();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not save journal entry.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entryId: string) {
    setActionError(null);
    setSuccess(null);

    try {
      await journal.removeEntry(entryId);
      if (editingId === entryId) {
        resetForm();
      }
      setSuccess("Journal entry deleted.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not delete journal entry.");
    }
  }

  return (
    <>
      <Navbar email={user.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Journal"
          title="Reflect without friction."
          subtitle="Capture what you studied, what felt difficult, and the next useful action after a session."
        />

        {journal.error || sessions.error || tasks.error ? <StatusMessage tone="error">{journal.error ?? sessions.error ?? tasks.error}</StatusMessage> : null}
        {actionError ? <StatusMessage tone="error">{actionError}</StatusMessage> : null}
        {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}

        <section className="grid gap-5 md:grid-cols-3">
          <MetricCard label="Entries" value={journal.entries.length} />
          <MetricCard label="Today" value={todayEntries} />
          <MetricCard label="Avg focus" value={averageFocus ? `${averageFocus}/5` : "None"} tone="gold" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[25rem_1fr]">
          <form className="card space-y-5 p-6 sm:p-8" onSubmit={handleSubmit}>
            <div>
              <p className="eyebrow">{editingId ? "Edit reflection" : "Quick reflection"}</p>
              <h2 className="section-title">Session journal</h2>
            </div>
            <label className="flex flex-col gap-2">
              <span className="label">Title</span>
              <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="What I learned today" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="label">Date</span>
                <input className="input" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
              </label>
              <label className="flex flex-col gap-2">
                <span className="label">Subject</span>
                <input className="input" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="Chemistry" />
              </label>
            </div>
            <label className="flex flex-col gap-2">
              <span className="label">Linked session</span>
              <select
                className="input"
                value={form.sessionId}
                onChange={(event) => {
                  const session = sessions.sessions.find((item) => item.id === event.target.value);
                  setForm({
                    ...form,
                    sessionId: session?.id ?? "",
                    taskId: session?.taskId ?? form.taskId,
                    subject: session?.subject ?? form.subject,
                    title: form.title || session?.taskTitle || ""
                  });
                }}
              >
                <option value="">No linked session</option>
                {sessions.sessions.slice(0, 20).map((session) => <option key={session.id} value={session.id}>{formatShortDate(session.date)} / {session.taskTitle}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="label">Linked task</span>
              <select className="input" value={form.taskId} onChange={(event) => setForm({ ...form, taskId: event.target.value })}>
                <option value="">No linked task</option>
                {tasks.tasks.slice(0, 40).map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
              </select>
            </label>
            <RatingRow label="Mood" value={form.moodRating} onChange={(value) => setForm({ ...form, moodRating: value })} />
            <RatingRow label="Focus" value={form.focusRating} onChange={(value) => setForm({ ...form, focusRating: value })} />
            <RatingRow label="Difficulty" value={form.difficultyRating} onChange={(value) => setForm({ ...form, difficultyRating: value })} />
            <label className="flex flex-col gap-2">
              <span className="label">What I studied</span>
              <textarea className="input min-h-24 resize-y" value={form.studiedText} onChange={(event) => setForm({ ...form, studiedText: event.target.value })} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="label">What felt difficult</span>
              <textarea className="input min-h-24 resize-y" value={form.struggleText} onChange={(event) => setForm({ ...form, struggleText: event.target.value })} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="label">Next action</span>
              <textarea className="input min-h-20 resize-y" value={form.nextAction} onChange={(event) => setForm({ ...form, nextAction: event.target.value })} />
            </label>
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" disabled={saving} type="submit">{saving ? "Saving" : editingId ? "Save entry" : "Add entry"}</button>
              {editingId ? <button className="btn-ghost" type="button" onClick={resetForm}>Cancel</button> : null}
            </div>
          </form>

          <section className="space-y-5">
            <div className="card p-6">
              <div className="grid gap-3 md:grid-cols-2">
                <input className="input" value={journal.searchQuery} onChange={(event) => journal.setSearchQuery(event.target.value)} placeholder="Search reflections" />
                <select className="input" value={journal.subjectFilter} onChange={(event) => journal.setSubjectFilter(event.target.value)}>
                  <option value="">All subjects</option>
                  {journal.subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                </select>
              </div>
            </div>
            {!dataReady || journal.loading ? (
              <LoadingState label="Loading journal entries" mode="inline" />
            ) : journal.entries.length === 0 ? (
              <EmptyState title="No reflections yet" description="Add one quick journal entry after a focus session." />
            ) : (
              <div className="space-y-4">
                {journal.filteredEntries.map((entry) => (
                  <article className="card p-6" key={entry.id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-forge-text">{entry.title}</h3>
                        <p className="mt-2 text-base text-forge-muted">{formatShortDate(entry.date)} / {entry.subject || "No subject"}</p>
                      </div>
                      <span className="badge">Focus {entry.focusRating}/5</span>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <JournalBlock label="Studied" value={entry.studiedText} />
                      <JournalBlock label="Struggled" value={entry.struggleText} />
                      <JournalBlock label="Next" value={entry.nextAction} />
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button className="btn-ghost" type="button" onClick={() => editEntry(entry)}>Edit</button>
                      <button className="btn-ghost" type="button" onClick={() => handleDelete(entry.id)}>Delete</button>
                    </div>
                  </article>
                ))}
                {!journal.searchQuery && !journal.subjectFilter && journal.hasMore ? (
                  <button className="btn-secondary w-full" type="button" onClick={journal.loadMore}>
                    Load more entries
                  </button>
                ) : null}
              </div>
            )}
          </section>
        </section>
      </main>
    </>
  );
}

function RatingRow({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <p className="label mb-2">{label}</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button className={rating === value ? "btn-primary px-4 py-2" : "btn-secondary px-4 py-2"} key={rating} type="button" onClick={() => onChange(rating)}>
            {rating}
          </button>
        ))}
      </div>
    </div>
  );
}

function JournalBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-forge-line bg-white p-4">
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-forge-muted">{label}</p>
      <p className="mt-2 text-base leading-7 text-forge-text">{value || "Not added"}</p>
    </div>
  );
}

export default function JournalPage() {
  return (
    <AuthGuard>
      <JournalContent />
    </AuthGuard>
  );
}
