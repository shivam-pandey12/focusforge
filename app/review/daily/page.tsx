"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import EmptyState from "@/components/EmptyState";
import FeatureLockedCard from "@/components/FeatureLockedCard";
import LoadingState from "@/components/LoadingState";
import MetricCard from "@/components/MetricCard";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import StatusMessage from "@/components/StatusMessage";
import { formatDuration, getTodayDateKey } from "@/lib/date";
import { useAuth } from "@/hooks/useAuth";
import { useDailyReview } from "@/hooks/useDailyReview";
import { useHabits } from "@/hooks/useHabits";
import { useJournal } from "@/hooks/useJournal";
import { usePlan } from "@/hooks/usePlan";
import { useProductivityScore } from "@/hooks/useProductivityScore";
import { useRevisions } from "@/hooks/useRevisions";
import { useSessions } from "@/hooks/useSessions";
import { useTasks } from "@/hooks/useTasks";

function DailyReviewContent() {
  const { user } = useAuth();
  const plan = usePlan(user?.uid);
  const hasAccess = plan.hasFeature("dailyReview");
  const today = getTodayDateKey();
  const sessions = useSessions(hasAccess ? user?.uid : undefined);
  const tasks = useTasks(hasAccess ? user?.uid : undefined);
  const habits = useHabits(hasAccess ? user?.uid : undefined);
  const revisions = useRevisions(hasAccess ? user?.uid : undefined);
  const productivity = useProductivityScore(hasAccess ? user?.uid : undefined);
  const journal = useJournal(hasAccess ? user?.uid : undefined);
  const review = useDailyReview(hasAccess ? user?.uid : undefined, today);
  const [form, setForm] = useState({
    winsText: "",
    improveText: "",
    tomorrowFocusText: "",
    moodRating: 3
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const suggestion = useMemo(() => {
    if (revisions.overdue.length > 0) {
      return "Clear one overdue revision before starting new work.";
    }

    return productivity.productivity.suggestions[0] ?? "Begin tomorrow with one focused 25 minute session.";
  }, [productivity.productivity.suggestions, revisions.overdue.length]);

  useEffect(() => {
    if (review.currentReview) {
      setForm({
        winsText: review.currentReview.winsText,
        improveText: review.currentReview.improveText,
        tomorrowFocusText: review.currentReview.tomorrowFocusText,
        moodRating: review.currentReview.moodRating
      });
    } else {
      setForm((current) => ({ ...current, tomorrowFocusText: suggestion }));
    }
  }, [review.currentReview, suggestion]);

  if (!plan.ready || plan.loading) {
    return (
      <>
        <Navbar email={user?.email} />
        <main className="page-shell">
          <LoadingState label="Checking plan access" mode="inline" />
        </main>
      </>
    );
  }

  if (!hasAccess) {
    return (
      <>
        <Navbar email={user?.email} />
        <main className="page-shell">
          <FeatureLockedCard
            feature="dailyReview"
            description="Daily review is part of Forge Elite. Your study data is safe; upgrade when you want guided reflection and advanced review flows."
          />
        </main>
      </>
    );
  }

  async function saveReview() {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      await review.saveReview({
        date: today,
        ...form
      });
      setMessage("Daily review saved.");
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not save review.");
    } finally {
      setSaving(false);
    }
  }

  const completedTasks = tasks.tasks.filter((task) => task.completed).length;
  const completedRevisions = revisions.completedToday.length;
  const todayJournal = journal.entries.find((entry) => entry.date === today);
  const combinedError =
    error ??
    sessions.error ??
    tasks.error ??
    habits.error ??
    revisions.error ??
    productivity.error ??
    journal.error ??
    review.error;

  return (
    <>
      <Navbar email={user?.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Daily Review"
          title="Close the day with useful clarity."
          subtitle="A two-minute reflection keeps progress visible without turning review into homework."
          action={<Link className="btn-secondary" href="/journal">Open Journal</Link>}
        />

        {combinedError ? <StatusMessage tone="error">{combinedError}</StatusMessage> : null}
        {message ? <StatusMessage tone="success">{message}</StatusMessage> : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Study time" value={formatDuration(sessions.totalStudyTimeToday)} detail={`${sessions.sessionsToday} sessions`} />
          <MetricCard label="Tasks completed" value={completedTasks} detail={`${tasks.tasks.length} planned today`} />
          <MetricCard label="Habits completed" value={`${habits.completedToday}/${habits.totalHabits}`} detail="Today check-ins" />
          <MetricCard label="Revisions done" value={completedRevisions} detail={`${revisions.dueToday.length + revisions.overdue.length} still due`} />
          <MetricCard label="Productivity score" value={productivity.productivity.score} detail="Out of 100" tone="gold" />
        </section>

        {!todayJournal && sessions.sessionsToday > 0 ? (
          <StatusMessage tone="info">
            You have a completed focus session today. Add a quick journal entry while the details are fresh.
          </StatusMessage>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="card p-6 sm:p-8">
            <SectionHeader title={"Today's reflection"} subtitle="Keep it short and honest. You can update it anytime." />
            <div className="mt-6 grid gap-5">
              <label className="grid gap-2">
                <span className="label">What went well?</span>
                <textarea className="input min-h-28" value={form.winsText} onChange={(event) => setForm({ ...form, winsText: event.target.value })} placeholder="One thing that worked today" />
              </label>
              <label className="grid gap-2">
                <span className="label">What should improve tomorrow?</span>
                <textarea className="input min-h-28" value={form.improveText} onChange={(event) => setForm({ ...form, improveText: event.target.value })} placeholder="One adjustment for tomorrow" />
              </label>
              <label className="grid gap-2">
                <span className="label">Tomorrow&apos;s focus</span>
                <textarea className="input min-h-24" value={form.tomorrowFocusText} onChange={(event) => setForm({ ...form, tomorrowFocusText: event.target.value })} />
              </label>
              <label className="grid gap-2">
                <span className="label">Mood rating</span>
                <select className="input" value={form.moodRating} onChange={(event) => setForm({ ...form, moodRating: Number(event.target.value) })}>
                  {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}
                </select>
              </label>
              <button className="btn-primary w-full sm:w-fit" disabled={saving} type="button" onClick={saveReview}>
                {saving ? "Saving" : review.currentReview ? "Update review" : "Save review"}
              </button>
            </div>
          </div>

          <div className="space-y-5">
            <section className="card p-6">
              <SectionHeader title="Suggested focus" subtitle="Rule-based, simple, and editable." />
              <p className="mt-4 text-lg font-bold leading-8 text-forge-text">{suggestion}</p>
            </section>
            <section className="card p-6">
              <SectionHeader title="Previous reviews" />
              {review.reviews.length === 0 ? (
                <div className="mt-4">
                  <EmptyState title="No reviews yet" description="Save today's review to start a calm reflection trail." />
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {review.reviews.map((entry) => (
                    <article className="rounded-2xl border border-forge-line bg-white p-4" key={entry.id}>
                      <p className="text-sm font-bold uppercase tracking-[0.14em] text-forge-muted">{entry.date}</p>
                      <p className="mt-2 text-base font-semibold text-forge-text">{entry.tomorrowFocusText || "Reflection saved"}</p>
                    </article>
                  ))}
                  {review.hasMore ? (
                    <button className="btn-secondary w-full" type="button" onClick={review.loadMore}>
                      Load more reviews
                    </button>
                  ) : null}
                </div>
              )}
            </section>
          </div>
        </section>
      </main>
    </>
  );
}

export default function DailyReviewPage() {
  return (
    <AuthGuard>
      <DailyReviewContent />
    </AuthGuard>
  );
}
