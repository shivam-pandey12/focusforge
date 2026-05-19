"use client";

import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/LoadingState";
import SectionHeader from "@/components/SectionHeader";
import StatusMessage from "@/components/StatusMessage";
import type { StudyTask } from "@/types";

interface TaskListProps {
  tasks: StudyTask[];
  loading: boolean;
  error?: string | null;
  onCompleteTask: (taskId: string) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onStartTask: (taskId: string) => void;
}

export default function TaskList({
  tasks,
  loading,
  error,
  onCompleteTask,
  onDeleteTask,
  onStartTask
}: TaskListProps) {
  if (loading) {
    return <LoadingState label="Loading today's tasks" mode="inline" />;
  }

  return (
    <section className="card p-6 sm:p-8">
      <SectionHeader eyebrow="Today" title="Study tasks" action={<span className="badge">{tasks.length} planned</span>} />

      {error ? <StatusMessage className="mt-6" tone="error">{error}</StatusMessage> : null}

      {tasks.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="No tasks yet"
            description="Add one clear task for today, then start a focused session when you are ready."
          />
        </div>
      ) : (
        <div className="mt-6 divide-y divide-forge-line overflow-hidden rounded-3xl border border-forge-line bg-white">
          {tasks.map((task) => (
            <article
              key={task.id}
              className="flex flex-col gap-5 p-5 transition hover:bg-forge-surface/70 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="truncate text-lg font-bold text-forge-text">{task.title}</h3>
                  <span className={task.completed ? "badge badge-done" : "badge badge-open"}>
                    {task.completed ? "Completed" : "Open"}
                  </span>
                </div>
                <p className="mt-2 text-base text-forge-muted">
                  {task.duration} minute session
                  {task.subject ? <span className="ml-2 text-forge-gold">/ {task.subject}</span> : null}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn-primary"
                  type="button"
                  disabled={task.completed}
                  onClick={() => onStartTask(task.id)}
                >
                  Start
                </button>
                <button
                  className="btn-secondary"
                  type="button"
                  disabled={task.completed}
                  onClick={() => onCompleteTask(task.id)}
                >
                  Complete
                </button>
                <button className="btn-ghost" type="button" onClick={() => onDeleteTask(task.id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
