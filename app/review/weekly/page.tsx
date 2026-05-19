"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import FeatureLockedCard from "@/components/FeatureLockedCard";
import LoadingState from "@/components/LoadingState";
import MetricCard from "@/components/MetricCard";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import StatusMessage from "@/components/StatusMessage";
import { formatDuration, formatShortDate, getDateKeysBetween, getWeekDateRange, getWeekKey } from "@/lib/date";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useAuth } from "@/hooks/useAuth";
import { useGoals } from "@/hooks/useGoals";
import { useHabits } from "@/hooks/useHabits";
import { useMockTests } from "@/hooks/useMockTests";
import { usePlan } from "@/hooks/usePlan";
import { useRevisions } from "@/hooks/useRevisions";
import { useWeakAreas } from "@/hooks/useWeakAreas";
import { useWeeklyReview } from "@/hooks/useWeeklyReview";

function WeeklyReviewContent() {
  const { user } = useAuth();
  const plan = usePlan(user?.uid);
  const hasAccess = plan.hasFeature("weeklyReview");
  const weekKey = getWeekKey();
  const weekRange = getWeekDateRange();
  const weekDates = getDateKeysBetween(weekRange.start, weekRange.end);
  const analytics = useAnalytics(hasAccess ? user?.uid : undefined);
  const habits = useHabits(hasAccess ? user?.uid : undefined);
  const revisions = useRevisions(hasAccess ? user?.uid : undefined);
  const mockTests = useMockTests(hasAccess ? user?.uid : undefined);
  const goals = useGoals(hasAccess ? user?.uid : undefined);
  const weakAreas = useWeakAreas(hasAccess ? user?.uid : undefined);
  const review = useWeeklyReview(hasAccess ? user?.uid : undefined, weekKey);
  const [form, setForm] = useState({
    winsText: "",
    challengesText: "",
    nextWeekFocusText: ""
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mockTestsThisWeek = useMemo(
    () => mockTests.tests.filter((test) => weekDates.includes(test.testDate)),
    [mockTests.tests, weekDates]
  );

  const goalCompletionRate = useMemo(() => {
    const total = goals.goalsWithProgress.length;
    const completed = goals.goalsWithProgress.filter((goal) => goal.progress.status === "completed").length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [goals.goalsWithProgress]);

  useEffect(() => {
    if (review.currentReview) {
      setForm({
        winsText: review.currentReview.winsText,
        challengesText: review.currentReview.challengesText,
        nextWeekFocusText: review.currentReview.nextWeekFocusText
      });
    } else {
      setForm((current) => ({
        ...current,
        nextWeekFocusText: weakAreas.topWeakArea
          ? `Start with ${weakAreas.topWeakArea.subject}: ${weakAreas.topWeakArea.nextAction}`
          : "Protect your first focus block early in the week."
      }));
    }
  }, [review.currentReview, weakAreas.topWeakArea]);

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
            feature="weeklyReview"
            description="Weekly review is part of Forge Elite. Your study history remains safe; upgrade when you want full weekly reflection and exam-prep summaries."
          />
        </main>
      </>
    );
  }

  async function saveReview() {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await review.saveReview({ weekKey, ...form });
      setMessage("Weekly review saved.");
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not save weekly review.");
    } finally {
      setSaving(false);
    }
  }

  const combinedError =
    error ??
    analytics.error ??
    habits.error ??
    revisions.error ??
    mockTests.error ??
    goals.error ??
    weakAreas.error ??
    review.error;

  return (
    <>
      <Navbar email={user?.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Weekly Review"
          title="Turn the week into a clearer next step."
          subtitle={`${formatShortDate(weekRange.start)} to ${formatShortDate(weekRange.end)} summary, reflection, and next-week focus.`}
        />

        {combinedError ? <StatusMessage tone="error">{combinedError}</StatusMessage> : null}
        {message ? <StatusMessage tone="success">{message}</StatusMessage> : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Study this week" value={formatDuration(analytics.weeklyStudyTime)} detail={`${analytics.sessionsThisWeek} sessions`} />
          <MetricCard label="Daily average" value={formatDuration(analytics.averageDailyStudyTime)} detail="Month-to-date average" />
          <MetricCard label="Task rate" value={`${analytics.taskCompletionRate}%`} detail="This month's task completion" />
          <MetricCard label="Habit rate" value={`${habits.weeklyCompletionRate}%`} detail="Weekly habit consistency" tone="gold" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="card p-6 sm:p-8">
            <SectionHeader title="Weekly reflection" subtitle="Capture what changed, what blocked you, and what gets priority next." />
            <div className="mt-6 grid gap-5">
              <label className="grid gap-2">
                <span className="label">Wins</span>
                <textarea className="input min-h-28" value={form.winsText} onChange={(event) => setForm({ ...form, winsText: event.target.value })} placeholder="What worked this week?" />
              </label>
              <label className="grid gap-2">
                <span className="label">Challenges</span>
                <textarea className="input min-h-28" value={form.challengesText} onChange={(event) => setForm({ ...form, challengesText: event.target.value })} placeholder="What created friction?" />
              </label>
              <label className="grid gap-2">
                <span className="label">Next week focus</span>
                <textarea className="input min-h-24" value={form.nextWeekFocusText} onChange={(event) => setForm({ ...form, nextWeekFocusText: event.target.value })} />
              </label>
              <button className="btn-primary w-full sm:w-fit" disabled={saving} type="button" onClick={saveReview}>
                {saving ? "Saving" : review.currentReview ? "Update review" : "Save weekly review"}
              </button>
            </div>
          </div>

          <div className="space-y-5">
            <section className="card p-6">
              <SectionHeader title="More signals" />
              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-forge-line bg-white p-4">
                  <p className="font-bold text-forge-text">Best study day</p>
                  <p className="mt-1 text-forge-muted">
                    {analytics.bestStudyDay ? `${formatShortDate(analytics.bestStudyDay.date)} with ${formatDuration(analytics.bestStudyDay.minutes)}` : "Not enough session data yet."}
                  </p>
                </div>
                <div className="rounded-2xl border border-forge-line bg-white p-4">
                  <p className="font-bold text-forge-text">Mock tests</p>
                  <p className="mt-1 text-forge-muted">{mockTestsThisWeek.length} recorded this week.</p>
                </div>
                <div className="rounded-2xl border border-forge-line bg-white p-4">
                  <p className="font-bold text-forge-text">Goal completion</p>
                  <p className="mt-1 text-forge-muted">{goalCompletionRate}% complete across active milestones.</p>
                </div>
                <div className="rounded-2xl border border-forge-line bg-white p-4">
                  <p className="font-bold text-forge-text">Weak area focus</p>
                  <p className="mt-1 text-forge-muted">
                    {weakAreas.topWeakArea ? `${weakAreas.topWeakArea.subject}: ${weakAreas.topWeakArea.status}` : "No weak area signal yet."}
                  </p>
                </div>
              </div>
            </section>
            <section className="card p-6">
              <SectionHeader title="Past weekly reviews" />
              <div className="mt-4 space-y-3">
                {review.reviews.map((entry) => (
                  <article className="rounded-2xl border border-forge-line bg-white p-4" key={entry.id}>
                    <p className="text-sm font-bold uppercase tracking-[0.14em] text-forge-muted">{entry.weekKey}</p>
                    <p className="mt-2 text-base font-semibold text-forge-text">{entry.nextWeekFocusText || "Review saved"}</p>
                  </article>
                ))}
                {review.reviews.length === 0 ? <p className="text-base text-forge-muted">Save this week to start your review history.</p> : null}
                {review.hasMore ? (
                  <button className="btn-secondary w-full" type="button" onClick={review.loadMore}>
                    Load more weekly reviews
                  </button>
                ) : null}
              </div>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}

export default function WeeklyReviewPage() {
  return (
    <AuthGuard>
      <WeeklyReviewContent />
    </AuthGuard>
  );
}
