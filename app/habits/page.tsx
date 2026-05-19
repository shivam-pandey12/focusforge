"use client";

import { FormEvent, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import EmptyState from "@/components/EmptyState";
import FeatureLockedCard from "@/components/FeatureLockedCard";
import LoadingState from "@/components/LoadingState";
import MetricCard from "@/components/MetricCard";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import ProgressBar from "@/components/ProgressBar";
import SectionHeader from "@/components/SectionHeader";
import StatusMessage from "@/components/StatusMessage";
import { HabitWithStats, useHabits } from "@/hooks/useHabits";
import { useAuth } from "@/hooks/useAuth";
import { useDeferredDataStart } from "@/hooks/useDeferredDataStart";
import { usePlan } from "@/hooks/usePlan";
import { getDayName, parseDateKey } from "@/lib/date";

const habitFormDefaults = {
  title: "",
  description: ""
};

function HabitsContent() {
  const { user, loading: authLoading } = useAuth();
  const dataReady = useDeferredDataStart();
  const plan = usePlan(dataReady ? user?.uid : undefined);
  const hasAccess = plan.hasFeature("habits");
  const habits = useHabits(dataReady && hasAccess ? user?.uid : undefined);
  const [form, setForm] = useState(habitFormDefaults);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (authLoading || !user) {
    return <LoadingState label="Loading habits" />;
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
            feature="habits"
            description="Habit tracking is part of Forge Pro. Existing habit data is preserved and can be unlocked again when you upgrade."
          />
        </main>
      </>
    );
  }

  function resetForm() {
    setForm(habitFormDefaults);
    setEditingId(null);
  }

  function editHabit(habit: HabitWithStats) {
    setEditingId(habit.id);
    setForm({
      title: habit.title,
      description: habit.description ?? ""
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
        await habits.saveHabit(editingId, form);
        setSuccess("Habit updated.");
      } else {
        await habits.createHabit(form);
        setSuccess("Habit created.");
      }

      resetForm();
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : "Could not save habit.");
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
      setActionError(currentError instanceof Error ? currentError.message : "Habit action failed.");
    }
  }

  return (
    <>
      <Navbar email={user.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Habits"
          title="Make consistency visible."
          subtitle="Create daily study anchors and check them off without turning progress into a game."
        />

        {habits.error ? <StatusMessage tone="error">{habits.error}</StatusMessage> : null}
        {actionError ? <StatusMessage tone="error">{actionError}</StatusMessage> : null}
        {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}

        <section className="grid gap-5 md:grid-cols-3">
          <MetricCard label="Today" value={`${habits.completedToday}/${habits.totalHabits}`} />
          <MetricCard label="Weekly rate" value={`${habits.weeklyCompletionRate}%`} />
          <MetricCard label="Active habits" value={habits.totalHabits} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[25rem_1fr]">
          <form className="card space-y-5 p-6 sm:p-8" onSubmit={handleSubmit}>
            <SectionHeader eyebrow={editingId ? "Edit habit" : "New habit"} title="Daily anchor" />
            <label className="flex flex-col gap-2">
              <span className="label">Habit</span>
              <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Solve 50 questions" />
            </label>
            <label className="flex flex-col gap-2">
              <span className="label">Description</span>
              <textarea className="input min-h-28 resize-y" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Optional detail or target" />
            </label>
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" disabled={saving} type="submit">
                {saving ? "Saving" : editingId ? "Save habit" : "Add habit"}
              </button>
              {editingId ? (
                <button className="btn-ghost" type="button" onClick={resetForm}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>

          <section className="card p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <SectionHeader eyebrow="Daily check-in" title="Today's habits" />
              <div className="w-full sm:max-w-xs">
                <ProgressBar
                  value={habits.totalHabits > 0 ? Math.round((habits.completedToday / habits.totalHabits) * 100) : 0}
                  label="Today complete"
                />
              </div>
            </div>

            <div className="mt-5">
              {!dataReady || habits.loading ? (
                <LoadingState label="Loading habits" mode="inline" />
              ) : habits.habitsWithStats.length === 0 ? (
                <EmptyState
                  title="No habits yet"
                  description="Create one daily habit and check it off when the work is done."
                />
              ) : (
                <div className="space-y-4">
                  {habits.habitsWithStats.map((habit) => (
                    <HabitCard
                      habit={habit}
                      key={habit.id}
                      onDelete={(item) => runAction(() => habits.removeHabit(item.id), "Habit deleted.")}
                      onEdit={editHabit}
                      onToggle={(item) =>
                        runAction(
                          () => habits.toggleToday(item.id, !item.completedToday),
                          item.completedToday ? "Habit unchecked." : "Habit checked off."
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </section>
      </main>
    </>
  );
}

function HabitCard({
  habit,
  onToggle,
  onEdit,
  onDelete
}: {
  habit: HabitWithStats;
  onToggle: (habit: HabitWithStats) => void;
  onEdit: (habit: HabitWithStats) => void;
  onDelete: (habit: HabitWithStats) => void;
}) {
  return (
    <article className={habit.completedToday ? "rounded-3xl border border-[#BCD5B4] bg-[#F2F8EF] p-5" : "rounded-3xl border border-forge-line bg-white p-5"}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <label className="flex items-start gap-3">
          <input checked={habit.completedToday} className="mt-1" onChange={() => onToggle(habit)} type="checkbox" />
          <span>
            <span className="block text-base font-bold text-forge-text">{habit.title}</span>
            {habit.description ? <span className="mt-1 block text-base leading-7 text-forge-muted">{habit.description}</span> : null}
          </span>
        </label>
        <span className="badge badge-open">{habit.streak} day streak</span>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-2">
        {habit.weeklyDates.map((item) => (
          <div className="text-center" key={item.date}>
            <div className={item.completed ? "mx-auto grid h-11 w-11 place-items-center rounded-full bg-forge-gold text-sm font-bold text-white" : "mx-auto grid h-11 w-11 place-items-center rounded-full border border-forge-line bg-white text-sm font-bold text-forge-muted"}>
              {getDayName(parseDateKey(item.date).getDay(), "short").slice(0, 1)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-ghost" type="button" onClick={() => onEdit(habit)}>
          Edit
        </button>
        <button className="btn-ghost" type="button" onClick={() => onDelete(habit)}>
          Delete
        </button>
      </div>
    </article>
  );
}

export default function HabitsPage() {
  return (
    <AuthGuard>
      <HabitsContent />
    </AuthGuard>
  );
}
