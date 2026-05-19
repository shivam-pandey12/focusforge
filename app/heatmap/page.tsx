"use client";

import { useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/LoadingState";
import MetricCard from "@/components/MetricCard";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import StatusMessage from "@/components/StatusMessage";
import UpgradePrompt from "@/components/UpgradePrompt";
import { useAuth } from "@/hooks/useAuth";
import { useDeferredDataStart } from "@/hooks/useDeferredDataStart";
import { useHeatmapData } from "@/hooks/useHeatmapData";
import { usePlan } from "@/hooks/usePlan";
import { formatLongDate, formatShortDate, getTodayDateKey } from "@/lib/date";
import type { HeatmapDay } from "@/types";

const intensityClass: Record<HeatmapDay["intensity"], string> = {
  0: "bg-forge-surfaceAlt/60",
  1: "bg-[#F1E2C8]",
  2: "bg-[#E6C79C]",
  3: "bg-[#C9A46C]",
  4: "bg-[#9C7134]"
};

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}

function HeatmapContent() {
  const { user, loading: authLoading } = useAuth();
  const dataReady = useDeferredDataStart();
  const plan = usePlan(user?.uid);
  const heatmapDays = plan.limits.heatmapHistoryDays;
  const heatmap = useHeatmapData(dataReady ? user?.uid : undefined, heatmapDays);
  const [selectedDate, setSelectedDate] = useState(getTodayDateKey());
  const selectedDay = heatmap.days.find((day) => day.date === selectedDate) ?? heatmap.days.at(-1) ?? null;
  const weeks = useMemo(() => {
    const result: HeatmapDay[][] = [];

    heatmap.days.forEach((day, index) => {
      const weekIndex = Math.floor(index / 7);
      result[weekIndex] = [...(result[weekIndex] ?? []), day];
    });

    return result;
  }, [heatmap.days]);

  if (authLoading || !user) {
    return <LoadingState label="Loading heatmap" />;
  }

  return (
    <>
      <Navbar email={user.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Focus heatmap"
          title="Consistency at a glance."
          subtitle={plan.hasFeature("fullHeatmap") ? "A calm yearly view of study minutes and completed focus sessions." : "Forge Starter shows the last 30 days. Upgrade when you want the full heatmap history."}
        />

        {heatmap.error ? <StatusMessage tone="error">{heatmap.error}</StatusMessage> : null}
        {!plan.hasFeature("fullHeatmap") ? (
          <UpgradePrompt
            requiredPlan="pro"
            description="Your 30-day heatmap stays useful on Forge Starter. Forge Pro unlocks full history when you want deeper consistency patterns."
            compact
          />
        ) : null}

        <section className="grid gap-5 md:grid-cols-3">
          <MetricCard label="Current streak" value={`${heatmap.currentStreak} days`} detail="From saved focus sessions." />
          <MetricCard label="Best streak" value={`${heatmap.bestStreak} days`} detail="Longest active session run." tone="gold" />
          <MetricCard label="Study time shown" value={formatMinutes(heatmap.totalMinutes)} detail="Across the heatmap range." />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <article className="card overflow-hidden p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Last {heatmapDays} days</p>
                <h2 className="section-title">Daily focus activity</h2>
              </div>
              {!dataReady || heatmap.loading ? <span className="badge">Syncing</span> : <span className="badge">Live data</span>}
            </div>

            {!dataReady || heatmap.loading ? (
              <LoadingState label="Loading heatmap" mode="inline" />
            ) : heatmap.sessions.length === 0 ? (
              <div className="mt-6">
                <EmptyState title="No focus sessions yet" description="Complete a focus timer and saved sessions will appear here." />
              </div>
            ) : (
              <div className="mt-6 overflow-x-auto pb-2">
                <div className="flex min-w-[48rem] gap-1.5">
                  {weeks.map((week, index) => (
                    <div className="grid grid-rows-7 gap-1.5" key={`week-${index}`}>
                      {week.map((day) => {
                        const active = day.date === selectedDay?.date;
                        const isToday = day.date === getTodayDateKey();

                        return (
                          <button
                            aria-label={`${formatLongDate(day.date)}: ${formatMinutes(day.minutes)}`}
                            className={[
                              "h-4 w-4 rounded-[5px] border transition hover:scale-125 focus:outline-none focus:ring-2 focus:ring-forge-gold/50",
                              intensityClass[day.intensity],
                              active ? "border-forge-gold ring-2 ring-forge-gold/30" : "border-forge-line",
                              isToday ? "shadow-glow" : ""
                            ].join(" ")}
                            key={day.date}
                            title={`${formatShortDate(day.date)}: ${formatMinutes(day.minutes)} / ${day.sessionCount} sessions`}
                            type="button"
                            onClick={() => setSelectedDate(day.date)}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-end gap-2 text-sm font-semibold text-forge-muted">
                  <span>Less</span>
                  {[0, 1, 2, 3, 4].map((level) => (
                    <span className={`h-4 w-4 rounded-[5px] border border-forge-line ${intensityClass[level as HeatmapDay["intensity"]]}`} key={level} />
                  ))}
                  <span>More</span>
                </div>
              </div>
            )}
          </article>

          <aside className="card p-6">
            <p className="eyebrow">Selected day</p>
            <h2 className="mt-2 text-2xl font-bold text-forge-text">
              {selectedDay ? formatLongDate(selectedDay.date) : "No day selected"}
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniStat label="Minutes" value={selectedDay ? formatMinutes(selectedDay.minutes) : "0m"} />
              <MiniStat label="Sessions" value={selectedDay?.sessionCount ?? 0} />
            </div>
            <div className="mt-5 space-y-3">
              {(selectedDay?.sessions.length ?? 0) === 0 ? (
                <p className="text-base text-forge-muted">No saved sessions for this date.</p>
              ) : (
                selectedDay?.sessions.map((session) => (
                  <div className="rounded-2xl border border-forge-line bg-white p-4" key={session.id}>
                    <p className="font-bold text-forge-text">{session.taskTitle}</p>
                    <p className="mt-1 text-sm text-forge-muted">{formatMinutes(session.duration)}</p>
                  </div>
                ))
              )}
            </div>
          </aside>
        </section>
      </main>
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-forge-line bg-white p-5">
      <p className="text-sm font-bold text-forge-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-forge-text">{value}</p>
    </div>
  );
}

export default function HeatmapPage() {
  return (
    <AuthGuard>
      <HeatmapContent />
    </AuthGuard>
  );
}
