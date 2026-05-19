"use client";

import AuthGuard from "@/components/AuthGuard";
import FeatureLockedCard from "@/components/FeatureLockedCard";
import LoadingState from "@/components/LoadingState";
import MetricCard from "@/components/MetricCard";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import StatusMessage from "@/components/StatusMessage";
import UpgradePrompt from "@/components/UpgradePrompt";
import { formatLongDate, formatShortDate } from "@/lib/date";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useAuth } from "@/hooks/useAuth";
import { useDeferredDataStart } from "@/hooks/useDeferredDataStart";
import { useGoals } from "@/hooks/useGoals";
import { useHeatmapData } from "@/hooks/useHeatmapData";
import { useMockTests } from "@/hooks/useMockTests";
import { usePlan } from "@/hooks/usePlan";
import { useProductivityScore } from "@/hooks/useProductivityScore";
import { useWeakAreas } from "@/hooks/useWeakAreas";

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

function AnalyticsContent() {
  const { user, loading: authLoading } = useAuth();
  const dataReady = useDeferredDataStart();
  const plan = usePlan(user?.uid);
  const canAdvancedAnalytics = plan.hasFeature("advancedAnalytics");
  const canMockTests = plan.hasFeature("mockTests") && plan.hasFeature("advancedMockAnalytics");
  const canProductivity = plan.hasFeature("productivityScore");
  const canWeakAreas = plan.hasFeature("weakAreas");
  const canGoals = plan.hasFeature("goals");
  const analytics = useAnalytics(dataReady ? user?.uid : undefined, plan.limits.analyticsHistoryDays);
  const mockTests = useMockTests(dataReady && canMockTests ? user?.uid : undefined);
  const productivity = useProductivityScore(dataReady && canProductivity ? user?.uid : undefined);
  const weakAreas = useWeakAreas(dataReady && canWeakAreas ? user?.uid : undefined);
  const goals = useGoals(dataReady && canGoals ? user?.uid : undefined);
  const heatmap = useHeatmapData(dataReady ? user?.uid : undefined, plan.limits.heatmapHistoryDays);
  const maxWeeklyMinutes = Math.max(...analytics.weeklyBars.map((bar) => bar.minutes), 1);
  const maxTaskMinutes = Math.max(...analytics.taskBreakdown.map((item) => item.minutes), 1);
  const maxSubjectMinutes = Math.max(...analytics.subjectBreakdown.map((item) => item.minutes), 1);
  const maxProductivity = Math.max(...productivity.productivity.weeklyBars.map((bar) => bar.score), 1);
  const recentMockTests = mockTests.tests.slice(0, 6).reverse();
  const goalCompletionRate = goals.goalsWithProgress.length > 0
    ? Math.round((goals.completedGoals.length / goals.goalsWithProgress.length) * 100)
    : 0;
  const activeHeatmapDays = heatmap.days.filter((day) => day.minutes > 0).length;

  if (authLoading || !user) {
    return <LoadingState label="Loading analytics" />;
  }

  return (
    <>
      <Navbar email={user.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Analytics"
          title="Useful patterns, not noise."
          subtitle="See where study time is going, how consistently sessions are completed, and which subjects get attention."
        />

        {analytics.error || mockTests.error || productivity.error || weakAreas.error || goals.error || heatmap.error ? (
          <StatusMessage tone="error">
            {analytics.error ?? mockTests.error ?? productivity.error ?? weakAreas.error ?? goals.error ?? heatmap.error}
          </StatusMessage>
        ) : null}
        {!canAdvancedAnalytics ? (
          <UpgradePrompt
            requiredPlan="pro"
            description="Forge Starter shows focused 7-day analytics. Forge Pro unlocks deeper analytics, longer history, and richer breakdowns."
            compact
          />
        ) : null}
        {!dataReady || analytics.loading || mockTests.loading || productivity.loading || weakAreas.loading || goals.loading || heatmap.loading ? (
          <div className="badge">Refreshing analytics</div>
        ) : null}

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Weekly study time"
            value={formatMinutes(analytics.weeklyStudyTime)}
            detail="Total minutes saved this week."
          />
          <MetricCard
            label={canAdvancedAnalytics ? "Monthly study time" : "7-day study time"}
            value={formatMinutes(analytics.monthlyStudyTime)}
            detail={canAdvancedAnalytics ? "Total minutes saved this month." : "Total minutes in your Starter analytics window."}
          />
          <MetricCard
            label="Daily average"
            value={formatMinutes(analytics.averageDailyStudyTime)}
            detail={canAdvancedAnalytics ? "Average per day so far this month." : "Average per day in the visible range."}
          />
          <MetricCard
            label="Longest streak"
            value={`${analytics.longestStreak} ${analytics.longestStreak === 1 ? "day" : "days"}`}
            detail="Best saved-session streak recorded."
          />
          <MetricCard
            label="Best study day"
            value={analytics.bestStudyDay ? formatMinutes(analytics.bestStudyDay.minutes) : "None"}
            detail={analytics.bestStudyDay ? formatLongDate(analytics.bestStudyDay.date) : "Save sessions to build history."}
          />
          <MetricCard
            label="Sessions this week"
            value={String(analytics.sessionsThisWeek)}
            detail="Completed focus timers saved this week."
          />
          <MetricCard
            label="Task completion"
            value={`${analytics.taskCompletionRate}%`}
            detail={canAdvancedAnalytics ? "Completed tasks out of planned tasks this month." : "Completed tasks in the visible range."}
          />
          <MetricCard
            label="Breakdowns"
            value={`${analytics.subjectBreakdown.length}`}
            detail="Active subject groups this month."
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="card p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">This week</p>
                <h2 className="section-title">Study time by day</h2>
              </div>
            </div>
            <div className="mt-7 grid grid-cols-7 gap-3">
              {analytics.weeklyBars.map((bar) => {
                const height = Math.max(12, Math.round((bar.minutes / maxWeeklyMinutes) * 150));

                return (
                  <div className="flex min-h-[12rem] flex-col justify-end gap-2" key={bar.date}>
                    <div
                      className="rounded-t-2xl bg-forge-gold/80"
                      style={{ height }}
                      title={`${formatLongDate(bar.date)}: ${formatMinutes(bar.minutes)}`}
                    />
                    <p className="text-center text-sm font-bold text-forge-muted">
                      {formatLongDate(bar.date).slice(0, 3)}
                    </p>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="card p-6 sm:p-8">
            <p className="eyebrow">Tasks</p>
            <h2 className="section-title">Top task time</h2>
            <div className="mt-5 space-y-4">
            {analytics.taskBreakdown.length === 0 ? (
                <p className="text-base text-forge-muted">No saved sessions in this range yet.</p>
              ) : (
                analytics.taskBreakdown.map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between gap-3 text-base">
                      <span className="truncate font-semibold text-forge-text">{item.label}</span>
                      <span className="font-semibold text-forge-muted">{formatMinutes(item.minutes)}</span>
                    </div>
                    <div className="mt-2 h-3 rounded-full bg-forge-surfaceAlt">
                      <div
                        className="h-3 rounded-full bg-forge-gold"
                        style={{ width: `${Math.max(8, (item.minutes / maxTaskMinutes) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="card p-6 sm:p-8">
          <p className="eyebrow">Subjects</p>
          <h2 className="section-title">Subject breakdown</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {analytics.subjectBreakdown.length === 0 ? (
              <p className="text-base text-forge-muted">Add subjects to tasks and save sessions to see this fill in.</p>
            ) : (
              analytics.subjectBreakdown.map((item) => (
                <div className="rounded-3xl border border-forge-line bg-white p-5" key={item.label}>
                  <div className="flex justify-between gap-3 text-base">
                    <span className="truncate font-semibold text-forge-text">{item.label}</span>
                    <span className="font-semibold text-forge-muted">{formatMinutes(item.minutes)}</span>
                  </div>
                  <div className="mt-3 h-3 rounded-full bg-forge-surfaceAlt">
                    <div
                      className="h-3 rounded-full bg-forge-gold"
                      style={{ width: `${Math.max(8, (item.minutes / maxSubjectMinutes) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="card p-6 sm:p-8">
            {canProductivity ? (
              <>
                <p className="eyebrow">Productivity</p>
                <h2 className="section-title">Weekly score trend</h2>
                <div className="mt-7 grid grid-cols-7 gap-3">
                  {productivity.productivity.weeklyBars.map((bar) => {
                    const height = Math.max(12, Math.round((bar.score / maxProductivity) * 150));

                    return (
                      <div className="flex min-h-[12rem] flex-col justify-end gap-2" key={bar.date}>
                        <div className="rounded-t-2xl bg-forge-gold/80" style={{ height }} title={`${formatLongDate(bar.date)}: ${bar.score}/100`} />
                        <p className="text-center text-sm font-bold text-forge-muted">{formatLongDate(bar.date).slice(0, 3)}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 rounded-3xl border border-forge-line bg-forge-surface p-5">
                  <p className="text-3xl font-bold text-forge-text">{productivity.productivity.score}/100</p>
                  <p className="mt-2 text-base text-forge-muted">Today&apos;s productivity score. Weekly average: {productivity.productivity.weeklyAverage}.</p>
                </div>
              </>
            ) : (
              <FeatureLockedCard
                feature="productivityScore"
                description="Productivity score is part of Forge Elite. Upgrade when you want a rule-based daily score and calm improvement suggestions."
              />
            )}
          </article>

          <article className="card p-6 sm:p-8">
            {canMockTests ? (
              <>
                <p className="eyebrow">Mock tests</p>
                <h2 className="section-title">Recent score trend</h2>
                {recentMockTests.length === 0 ? (
                  <p className="mt-5 text-base text-forge-muted">Add mock tests to unlock performance trends.</p>
                ) : (
                  <div className="mt-7 grid grid-cols-6 gap-3">
                    {recentMockTests.map((test) => (
                      <div className="flex min-h-[12rem] flex-col justify-end gap-2" key={test.id}>
                        <div className="rounded-t-2xl bg-forge-gold" style={{ height: `${Math.max(12, test.percentage * 1.4)}px` }} title={`${test.title}: ${test.percentage}%`} />
                        <p className="truncate text-center text-sm font-bold text-forge-muted">{formatShortDate(test.testDate)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <FeatureLockedCard
                feature="advancedMockAnalytics"
                description="Mock test trends are part of Forge Pro and Elite. Your study basics stay available, and exam-performance tracking unlocks when you upgrade."
              />
            )}
          </article>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          <MetricCard label="Goal completion" value={canGoals ? `${goalCompletionRate}%` : "Pro"} detail={canGoals ? "Completed goals out of all goals." : "Goals unlock with Forge Pro."} />
          <MetricCard label="Attention areas" value={canWeakAreas ? weakAreas.weakAreas.filter((area) => area.status === "Needs attention" || area.status === "Falling behind").length : "Elite"} detail={canWeakAreas ? "Rule-based weak-area signals." : "Weak-area detection unlocks with Forge Elite."} tone="warning" />
          <MetricCard label="Active heatmap days" value={activeHeatmapDays} detail="Days with saved focus activity in the visible range." tone="gold" />
        </section>
      </main>
    </>
  );
}

export default function AnalyticsPage() {
  return (
    <AuthGuard>
      <AnalyticsContent />
    </AuthGuard>
  );
}
