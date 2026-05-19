"use client";

import { FormEvent, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import EmptyState from "@/components/EmptyState";
import FeatureLockedCard from "@/components/FeatureLockedCard";
import LoadingState from "@/components/LoadingState";
import MetricCard from "@/components/MetricCard";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import ProgressBar from "@/components/ProgressBar";
import StatusMessage from "@/components/StatusMessage";
import { useAuth } from "@/hooks/useAuth";
import { useDeferredDataStart } from "@/hooks/useDeferredDataStart";
import { StudyGoalWithProgress, useGoals } from "@/hooks/useGoals";
import { usePlan } from "@/hooks/usePlan";
import { useSyllabus } from "@/hooks/useSyllabus";
import { formatShortDate, getTodayDateKey } from "@/lib/date";
import type { StudyGoalStatus, StudyGoalType } from "@/types";

const goalTypeLabels: Record<StudyGoalType, string> = {
  studyHours: "Study hours",
  taskCompletion: "Task completion",
  subjectCompletion: "Subject completion %",
  chapterCompletion: "Chapter completion %",
  mockTestScore: "Mock test score %",
  habitConsistency: "Habit consistency %"
};

interface GoalFormState {
  title: string;
  goalType: StudyGoalType;
  targetValue: number;
  currentValue: number;
  startDate: string;
  targetDate: string;
  linkedSubjectId: string;
  linkedSubjectName: string;
  linkedChapterId: string;
  linkedChapterName: string;
  status: StudyGoalStatus;
}

const defaultForm: GoalFormState = {
  title: "",
  goalType: "studyHours",
  targetValue: 10,
  currentValue: 0,
  startDate: getTodayDateKey(),
  targetDate: getTodayDateKey(),
  linkedSubjectId: "",
  linkedSubjectName: "",
  linkedChapterId: "",
  linkedChapterName: "",
  status: "active"
};

function GoalsContent() {
  const { user, loading: authLoading } = useAuth();
  const dataReady = useDeferredDataStart();
  const plan = usePlan(dataReady ? user?.uid : undefined);
  const hasAccess = plan.hasFeature("goals");
  const goals = useGoals(dataReady && hasAccess ? user?.uid : undefined);
  const syllabus = useSyllabus(dataReady && hasAccess ? user?.uid : undefined);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const selectedSubject = syllabus.subjects.find((subject) => subject.id === form.linkedSubjectId);
  const chaptersForSubject = useMemo(
    () => syllabus.chapters.filter((chapter) => chapter.subjectId === form.linkedSubjectId),
    [form.linkedSubjectId, syllabus.chapters]
  );
  const completionRate = goals.goalsWithProgress.length > 0
    ? Math.round((goals.completedGoals.length / goals.goalsWithProgress.length) * 100)
    : 0;

  if (authLoading || !user) {
    return <LoadingState label="Loading goals" />;
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
            feature="goals"
            description="Goals and milestones are part of Forge Pro. Downgrades never delete goal data; upgrade to unlock it again."
          />
        </main>
      </>
    );
  }

  function resetForm() {
    setForm(defaultForm);
    setEditingId(null);
  }

  function editGoal(goal: StudyGoalWithProgress) {
    setEditingId(goal.id);
    setForm({
      title: goal.title,
      goalType: goal.goalType,
      targetValue: goal.targetValue,
      currentValue: goal.currentValue,
      startDate: goal.startDate,
      targetDate: goal.targetDate,
      linkedSubjectId: goal.linkedSubjectId ?? "",
      linkedSubjectName: goal.linkedSubjectName ?? "",
      linkedChapterId: goal.linkedChapterId ?? "",
      linkedChapterName: goal.linkedChapterName ?? "",
      status: goal.status
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
      const subject = syllabus.subjects.find((item) => item.id === form.linkedSubjectId);
      const chapter = syllabus.chapters.find((item) => item.id === form.linkedChapterId);
      const payload = {
        ...form,
        linkedSubjectName: subject?.name ?? form.linkedSubjectName,
        linkedChapterName: chapter?.name ?? form.linkedChapterName
      };

      if (editingId) {
        await goals.saveGoal(editingId, payload);
        setSuccess("Goal updated.");
      } else {
        await goals.createGoal(payload);
        setSuccess("Goal created.");
      }

      resetForm();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not save goal.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(goalId: string) {
    setActionError(null);
    setSuccess(null);

    try {
      await goals.removeGoal(goalId);
      if (editingId === goalId) {
        resetForm();
      }
      setSuccess("Goal deleted.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not delete goal.");
    }
  }

  return (
    <>
      <Navbar email={user.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Goals"
          title="Turn plans into milestones."
          subtitle="Set focused targets, track automatic progress when possible, and keep deadlines visible."
        />

        {goals.error ? <StatusMessage tone="error">{goals.error}</StatusMessage> : null}
        {actionError ? <StatusMessage tone="error">{actionError}</StatusMessage> : null}
        {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}

        <section className="grid gap-5 md:grid-cols-4">
          <MetricCard label="Active goals" value={goals.activeGoals.length} />
          <MetricCard label="Overdue" value={goals.overdueGoals.length} tone="warning" />
          <MetricCard label="Completed" value={goals.completedGoals.length} tone="success" />
          <MetricCard label="Completion rate" value={`${completionRate}%`} tone="gold" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[25rem_1fr]">
          <form className="card space-y-5 p-6 sm:p-8" onSubmit={handleSubmit}>
            <div>
              <p className="eyebrow">{editingId ? "Edit goal" : "New goal"}</p>
              <h2 className="section-title">Milestone</h2>
            </div>
            <label className="flex flex-col gap-2">
              <span className="label">Title</span>
              <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Complete physics revision" />
            </label>
            <label className="flex flex-col gap-2">
              <span className="label">Goal type</span>
              <select className="input" value={form.goalType} onChange={(event) => setForm({ ...form, goalType: event.target.value as StudyGoalType })}>
                {Object.entries(goalTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField label="Target" value={form.targetValue} onChange={(value) => setForm({ ...form, targetValue: value })} />
              <NumberField label="Manual progress" value={form.currentValue} onChange={(value) => setForm({ ...form, currentValue: value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="label">Start date</span>
                <input className="input" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
              </label>
              <label className="flex flex-col gap-2">
                <span className="label">Target date</span>
                <input className="input" type="date" value={form.targetDate} onChange={(event) => setForm({ ...form, targetDate: event.target.value })} />
              </label>
            </div>
            <label className="flex flex-col gap-2">
              <span className="label">Linked subject</span>
              <select
                className="input"
                value={form.linkedSubjectId}
                onChange={(event) => {
                  const subject = syllabus.subjects.find((item) => item.id === event.target.value);
                  setForm({
                    ...form,
                    linkedSubjectId: subject?.id ?? "",
                    linkedSubjectName: subject?.name ?? "",
                    linkedChapterId: "",
                    linkedChapterName: ""
                  });
                }}
              >
                <option value="">No linked subject</option>
                {syllabus.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="label">Linked chapter</span>
              <select
                className="input"
                value={form.linkedChapterId}
                onChange={(event) => {
                  const chapter = chaptersForSubject.find((item) => item.id === event.target.value);
                  setForm({
                    ...form,
                    linkedChapterId: chapter?.id ?? "",
                    linkedChapterName: chapter?.name ?? ""
                  });
                }}
                disabled={!selectedSubject}
              >
                <option value="">No linked chapter</option>
                {chaptersForSubject.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-forge-line bg-white px-5 py-4 text-base font-bold text-forge-text">
              <input checked={form.status === "completed"} onChange={(event) => setForm({ ...form, status: event.target.checked ? "completed" : "active" })} type="checkbox" />
              Mark completed
            </label>
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" disabled={saving} type="submit">{saving ? "Saving" : editingId ? "Save goal" : "Add goal"}</button>
              {editingId ? <button className="btn-ghost" type="button" onClick={resetForm}>Cancel</button> : null}
            </div>
          </form>

          <section className="space-y-4">
            {!dataReady || goals.loading ? (
              <LoadingState label="Loading goals" mode="inline" />
            ) : goals.goalsWithProgress.length === 0 ? (
              <EmptyState title="No goals yet" description="Create one clear milestone and FocusForge will keep its progress visible." />
            ) : (
              <>
                {goals.goalsWithProgress.map((goal) => (
                  <article className="card p-6" key={goal.id}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-forge-text">{goal.title}</h3>
                        <p className="mt-2 text-base text-forge-muted">
                          {goalTypeLabels[goal.goalType]} / due {formatShortDate(goal.targetDate)}
                        </p>
                        {goal.linkedSubjectName ? <p className="mt-1 text-base text-forge-muted">{goal.linkedSubjectName}{goal.linkedChapterName ? ` / ${goal.linkedChapterName}` : ""}</p> : null}
                      </div>
                      <span className={goal.progress.status === "overdue" ? "badge border-amber-200 bg-amber-50 text-amber-800" : goal.progress.status === "completed" ? "badge badge-done" : "badge badge-open"}>
                        {goal.progress.status}
                      </span>
                    </div>
                    <div className="mt-5">
                      <ProgressBar value={goal.progress.percent} label={`${goal.progress.currentValue}/${goal.targetValue}`} />
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button className="btn-ghost" type="button" onClick={() => editGoal(goal)}>Edit</button>
                      <button className="btn-ghost" type="button" onClick={() => handleDelete(goal.id)}>Delete</button>
                    </div>
                  </article>
                ))}
                {goals.hasMore ? (
                  <button className="btn-secondary w-full" type="button" onClick={goals.loadMore}>
                    Load more goals
                  </button>
                ) : null}
              </>
            )}
          </section>
        </section>
      </main>
    </>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="label">{label}</span>
      <input className="input" min="0" type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

export default function GoalsPage() {
  return (
    <AuthGuard>
      <GoalsContent />
    </AuthGuard>
  );
}
