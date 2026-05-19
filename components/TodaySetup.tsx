import Link from "next/link";
import ProgressBar from "@/components/ProgressBar";
import type { ActiveFocusSessionSnapshot } from "@/lib/activeFocusSession";
import { formatDuration } from "@/lib/date";
import type { DailyBattlePlanItem } from "@/types";

interface TodaySetupProps {
  dailyTargetMinutes: number;
  targetProgress: number;
  preferredFocusDuration: number;
  dailyReviewDone: boolean;
  unreadReminders: number;
  weeklyStudyMinutes: number;
  completedSessionsThisWeek: number;
  abandonedSessionsThisWeek: number;
  bestFocusDay: string | null;
  activeSession: ActiveFocusSessionSnapshot | null;
  productivityScore: number;
  backlogActiveCount: number;
  heavyBacklogCount: number;
  backlogClearedThisWeek: number;
  battlePlanItems: DailyBattlePlanItem[];
  battlePlanSaved: boolean;
  battlePlanAvailableMinutes: number;
  weakFocusTitle: string | null;
  weakFocusDetail: string | null;
  loading: boolean;
}

export default function TodaySetup({
  dailyTargetMinutes,
  targetProgress,
  preferredFocusDuration,
  dailyReviewDone,
  unreadReminders,
  weeklyStudyMinutes,
  completedSessionsThisWeek,
  abandonedSessionsThisWeek,
  bestFocusDay,
  activeSession,
  productivityScore,
  backlogActiveCount,
  heavyBacklogCount,
  backlogClearedThisWeek,
  battlePlanItems,
  battlePlanSaved,
  battlePlanAvailableMinutes,
  weakFocusTitle,
  weakFocusDetail,
  loading
}: TodaySetupProps) {
  return (
    <section className="card p-6 sm:p-7">
      <div className="section-header">
        <div>
          <p className="eyebrow">Today setup</p>
          <h2 className="section-title">Targets, reminders, and review</h2>
          <p className="section-subtitle">A compact launch-ready layer without crowding the command center.</p>
        </div>
        <Link className="btn-secondary" href="/settings">Settings</Link>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {activeSession ? (
          <div className="rounded-2xl border border-forge-gold/50 bg-[#FFF8EA] p-5 shadow-glow">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-forge-muted">Active session</p>
            <p className="mt-3 text-lg font-bold text-forge-text">{activeSession.title}</p>
            <p className="mt-1 text-sm font-semibold text-forge-muted">
              {activeSession.mode} / {activeSession.status}
            </p>
            <Link className="btn-primary mt-4 w-full" href="/focus">Return to focus</Link>
          </div>
        ) : null}
        <div className="rounded-2xl border border-forge-line bg-white p-5">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-forge-muted">Backlog</p>
          <p className="mt-3 text-lg font-bold text-forge-text">{loading ? "..." : `${backlogActiveCount} active`}</p>
          <p className="mt-1 text-sm font-semibold text-forge-muted">
            {heavyBacklogCount} heavy / {backlogClearedThisWeek} cleared this week
          </p>
          <Link className="btn-secondary mt-4 w-full" href="/backlog">Open backlog</Link>
        </div>
        <div className="rounded-2xl border border-forge-line bg-white p-5 md:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-forge-muted">Today&apos;s best moves</p>
              <p className="mt-2 text-sm font-semibold text-forge-muted">
                {battlePlanSaved ? `${battlePlanAvailableMinutes}m saved plan` : "Preview from current data"}
              </p>
            </div>
            <Link className="btn-secondary" href="/battle-plan">{battlePlanSaved ? "Open" : "Generate"}</Link>
          </div>
          <div className="mt-4 grid gap-2">
            {battlePlanItems.length === 0 ? (
              <p className="text-sm font-semibold text-forge-muted">No recommendations yet. Add homework, revision, backlog, exams, or marks.</p>
            ) : (
              battlePlanItems.slice(0, 3).map((item) => (
                <div className="rounded-2xl border border-forge-line bg-forge-surfaceAlt/60 p-3" key={item.id}>
                  <p className="font-bold text-forge-text">{item.title}</p>
                  <p className="mt-1 text-xs font-semibold text-forge-muted">
                    {item.recommendedDuration}m / {item.priority} / {item.status}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-forge-line bg-white p-5">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-forge-muted">Weak focus</p>
          <p className="mt-3 text-lg font-bold text-forge-text">{weakFocusTitle ?? "No weak signal"}</p>
          <p className="mt-1 text-sm font-semibold text-forge-muted">{weakFocusDetail ?? "Add marks or topic statuses."}</p>
          <Link className="btn-secondary mt-4 w-full" href={weakFocusTitle ? "/marks" : "/topics"}>Review signal</Link>
        </div>
        <div className="rounded-2xl border border-forge-line bg-white p-5">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-forge-muted">Daily target</p>
          <p className="mt-3 text-2xl font-bold text-forge-text">
            {loading ? "..." : `${Math.min(100, targetProgress)}%`}
          </p>
          <p className="mt-1 text-sm font-semibold text-forge-muted">Goal: {dailyTargetMinutes}m</p>
          <div className="mt-4">
            <ProgressBar value={targetProgress} />
          </div>
        </div>
        <div className="rounded-2xl border border-forge-line bg-white p-5">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-forge-muted">Quick start</p>
          <p className="mt-3 text-2xl font-bold text-forge-text">{preferredFocusDuration}m</p>
          <Link className="btn-primary mt-4 w-full" href="/focus">Start focus</Link>
        </div>
        <div className="rounded-2xl border border-forge-line bg-white p-5">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-forge-muted">Focus progress</p>
          <p className="mt-3 text-lg font-bold text-forge-text">{formatDuration(weeklyStudyMinutes)} this week</p>
          <p className="mt-1 text-sm font-semibold text-forge-muted">
            {bestFocusDay ? `Best day: ${bestFocusDay}` : "No focus sessions yet"}
          </p>
          <p className="mt-1 text-xs font-semibold text-forge-muted">
            {completedSessionsThisWeek} completed / {abandonedSessionsThisWeek} abandoned
          </p>
        </div>
        <div className="rounded-2xl border border-forge-line bg-white p-5">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-forge-muted">Review</p>
          <p className="mt-3 text-lg font-bold text-forge-text">{dailyReviewDone ? "Completed today" : "Ready tonight"}</p>
          <Link className="btn-secondary mt-4 w-full" href="/review/daily">
            {dailyReviewDone ? "Open review" : "Daily review"}
          </Link>
        </div>
        <div className="rounded-2xl border border-forge-line bg-white p-5">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-forge-muted">Signals</p>
          <p className="mt-3 text-lg font-bold text-forge-text">{unreadReminders} reminders</p>
          <p className="mt-1 text-sm font-semibold text-forge-muted">
            {formatDuration(weeklyStudyMinutes)} this week - score {productivityScore}
          </p>
          <Link className="btn-secondary mt-4 w-full" href="/reminders">Open reminders</Link>
        </div>
      </div>
    </section>
  );
}
