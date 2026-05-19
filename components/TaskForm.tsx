"use client";

import { FormEvent, useState } from "react";
import SectionHeader from "@/components/SectionHeader";
import StatusMessage from "@/components/StatusMessage";

interface TaskFormProps {
  onAddTask: (title: string, duration: number, subject?: string) => Promise<void>;
}

export default function TaskForm({ onAddTask }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState("25");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const parsedDuration = Number(duration);

    if (!trimmedTitle) {
      setError("Enter a task title.");
      return;
    }

    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
      setError("Duration must be greater than 0 minutes.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onAddTask(trimmedTitle, parsedDuration, subject);
      setTitle("");
      setSubject("");
      setDuration("25");
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not add task.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card p-6 sm:p-8" onSubmit={handleSubmit}>
      <SectionHeader eyebrow="Plan the next move" title="Add a study task" />
      <div className="mt-6 grid gap-5 md:grid-cols-[1fr_15rem_12rem_auto] md:items-end">
        <label className="flex flex-col gap-2">
          <span className="label">Task title</span>
          <input
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Physics chapter review"
            required
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Subject</span>
          <input
            className="input"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Physics"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Minutes</span>
          <input
            className="input"
            type="number"
            min="1"
            step="1"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            required
          />
        </label>
        <button className="btn-primary w-full md:w-auto" type="submit" disabled={submitting}>
          {submitting ? "Adding" : "Add task"}
        </button>
      </div>
      {error ? <StatusMessage className="mt-5" tone="error">{error}</StatusMessage> : null}
    </form>
  );
}
