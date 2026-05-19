"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import EmptyState from "@/components/EmptyState";
import LimitReachedNotice from "@/components/LimitReachedNotice";
import LoadingState from "@/components/LoadingState";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import StatusMessage from "@/components/StatusMessage";
import { useAllTasks } from "@/hooks/useAllTasks";
import { useAuth } from "@/hooks/useAuth";
import { useDeferredDataStart } from "@/hooks/useDeferredDataStart";
import { useNotes } from "@/hooks/useNotes";
import { usePlan } from "@/hooks/usePlan";
import { isAtLimit } from "@/lib/plans";
import type { StudyNote } from "@/types";

function NotesContent() {
  const { user, loading: authLoading } = useAuth();
  const plan = usePlan(user?.uid);
  const {
    notes,
    filteredNotes,
    searchQuery,
    setSearchQuery,
    loading: notesLoading,
    error: notesError,
    createNote,
    saveNote,
    removeNote,
    hasMore,
    loadMore
  } = useNotes(user?.uid);
  const linkedTasksReady = useDeferredDataStart(120);
  const { tasks, loading: tasksLoading } = useAllTasks(linkedTasksReady ? user?.uid : undefined);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("");
  const [linkedTaskId, setLinkedTaskId] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) ?? null,
    [notes, selectedNoteId]
  );
  const noteLimitReached = isAtLimit(notes.length, plan.limits.notesLimit);

  useEffect(() => {
    if (!selectedNoteId && notes.length > 0) {
      setSelectedNoteId(notes[0].id);
    }
  }, [notes, selectedNoteId]);

  useEffect(() => {
    if (!selectedNote) {
      setTitle("");
      setContent("");
      setSubject("");
      setLinkedTaskId("");
      return;
    }

    setTitle(selectedNote.title);
    setContent(selectedNote.content);
    setSubject(selectedNote.subject ?? "");
    setLinkedTaskId(selectedNote.linkedTaskId ?? "");
  }, [selectedNote]);

  if (authLoading || !user) {
    return <LoadingState label="Loading notes" />;
  }

  function startNewNote() {
    setSelectedNoteId(null);
    setTitle("");
    setContent("");
    setSubject("");
    setLinkedTaskId("");
    setActionError(null);
    setSuccess(null);
  }

  async function handleSaveNote() {
    if (!selectedNote && noteLimitReached) {
      setActionError("Forge Starter includes 20 notes. Your existing notes are safe, and Forge Pro unlocks unlimited notes.");
      return;
    }

    const linkedTask = tasks.find((task) => task.id === linkedTaskId);
    const payload = {
      title,
      content,
      subject,
      linkedTaskId: linkedTaskId ? linkedTask?.id ?? selectedNote?.linkedTaskId ?? linkedTaskId : "",
      linkedTaskTitle: linkedTaskId ? linkedTask?.title ?? selectedNote?.linkedTaskTitle ?? "" : ""
    };

    setSaving(true);
    setActionError(null);
    setSuccess(null);

    try {
      if (selectedNote) {
        await saveNote(selectedNote.id, payload);
        setSuccess("Note updated.");
      } else {
        const noteId = await createNote(payload);
        setSelectedNoteId(noteId);
        setSuccess("Note created.");
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not save note.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteNote(note: StudyNote) {
    setActionError(null);
    setSuccess(null);

    try {
      await removeNote(note.id);
      setSelectedNoteId(null);
      setSuccess("Note deleted.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not delete note.");
    }
  }

  return (
    <>
      <Navbar email={user.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Notes"
          title="Keep the thinking close."
          subtitle="Capture study notes, connect them to tasks, and search through the day's context without clutter."
          action={
            <button className="btn-primary" type="button" onClick={startNewNote}>
              New note
            </button>
          }
        />

        {notesError ? <StatusMessage tone="error">{notesError}</StatusMessage> : null}
        {actionError ? <StatusMessage tone="error">{actionError}</StatusMessage> : null}
        {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}
        {noteLimitReached ? (
          <LimitReachedNotice
            currentPlan={plan.plan}
            limitLabel="Forge Starter includes 20 notes."
          />
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[24rem_1fr]">
          <aside className="card p-6">
            <label className="flex flex-col gap-2">
              <span className="label">Search notes</span>
              <input
                className="input"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by title, content, subject"
              />
            </label>

            <div className="mt-5">
              {notesLoading ? (
                <LoadingState label="Loading notes" mode="inline" />
              ) : filteredNotes.length === 0 ? (
                <EmptyState
                  title={notes.length === 0 ? "No notes yet" : "No matching notes"}
                  description={
                    notes.length === 0
                      ? "Create your first note and link it to a study task when useful."
                      : "Try a different search term or clear the search field."
                  }
                />
              ) : (
                <div className="space-y-3">
                  {filteredNotes.map((note) => {
                    const active = note.id === selectedNoteId;

                    return (
                      <button
                        className={
                          active
                            ? "w-full rounded-3xl border border-forge-gold bg-[#FFF8EA] p-5 text-left shadow-soft"
                            : "w-full rounded-3xl border border-forge-line bg-white p-5 text-left transition hover:border-forge-gold/60"
                        }
                        key={note.id}
                        type="button"
                        onClick={() => setSelectedNoteId(note.id)}
                      >
                        <span className="block truncate text-base font-bold text-forge-text">{note.title}</span>
                        <span className="mt-2 block line-clamp-2 text-sm leading-6 text-forge-muted">
                          {note.content || "No content yet"}
                        </span>
                        <span className="mt-3 flex flex-wrap gap-2">
                          {note.subject ? <span className="badge">{note.subject}</span> : null}
                          {note.linkedTaskTitle ? <span className="badge badge-open">{note.linkedTaskTitle}</span> : null}
                        </span>
                      </button>
                    );
                  })}
                  {!searchQuery && hasMore ? (
                    <button className="btn-secondary w-full" type="button" onClick={loadMore}>
                      Load more notes
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </aside>

          <section className="card p-6 sm:p-8">
            <div className="grid gap-5 md:grid-cols-[1fr_15rem]">
              <label className="flex flex-col gap-2">
                <span className="label">Title</span>
                <input
                  className="input"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Photosynthesis summary"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="label">Subject</span>
                <input
                  className="input"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Biology"
                />
              </label>
            </div>

            <label className="mt-5 flex flex-col gap-2">
              <span className="label">Linked task</span>
              <select
                className="input"
                value={linkedTaskId}
                onChange={(event) => setLinkedTaskId(event.target.value)}
              >
                <option value="">No linked task</option>
                {tasksLoading ? <option disabled>Loading tasks...</option> : null}
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-5 flex flex-col gap-2">
              <span className="label">Content</span>
              <textarea
                className="input min-h-[22rem] resize-y leading-7"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Write the important ideas here."
              />
            </label>

            <div className="mt-6 flex flex-wrap gap-3">
              <button className="btn-primary" type="button" onClick={handleSaveNote} disabled={saving}>
                {saving ? "Saving" : selectedNote ? "Save note" : "Create note"}
              </button>
              {selectedNote ? (
                <button className="btn-ghost" type="button" onClick={() => handleDeleteNote(selectedNote)}>
                  Delete
                </button>
              ) : null}
            </div>
          </section>
        </section>
      </main>
    </>
  );
}

export default function NotesPage() {
  return (
    <AuthGuard>
      <NotesContent />
    </AuthGuard>
  );
}
