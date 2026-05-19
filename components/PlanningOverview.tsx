import Link from "next/link";
import LoadingState from "@/components/LoadingState";
import ProgressBar from "@/components/ProgressBar";
import SectionHeader from "@/components/SectionHeader";
import { formatDuration } from "@/lib/date";
import type { TimetableBlock } from "@/types";

interface PlanningOverviewProps {
  nextBlock: TimetableBlock | null;
  revisionsDue: number;
  revisionsOverdue: number;
  syllabusProgress: number;
  habitsCompletedToday: number;
  totalHabits: number;
  loading: boolean;
}

export default function PlanningOverview({
  nextBlock,
  revisionsDue,
  revisionsOverdue,
  syllabusProgress,
  habitsCompletedToday,
  totalHabits,
  loading
}: PlanningOverviewProps) {
  if (loading) {
    return (
      <section className="card p-6 sm:p-8">
        <LoadingState label="Loading planning overview" mode="inline" />
      </section>
    );
  }

  return (
    <section className="card p-6 sm:p-8">
      <SectionHeader
        eyebrow="Planning overview"
        title="The next layer of progress."
        action={
          <Link className="btn-ghost" href="/timetable">
          Open planner
          </Link>
        }
      />

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link className="interactive-card" href="/timetable">
          <span className="eyebrow text-forge-muted">Next block</span>
          <span className="mt-3 block text-xl font-bold text-forge-text">{nextBlock?.title ?? "No block yet"}</span>
          <span className="mt-2 block text-base text-forge-muted">
            {nextBlock ? `${nextBlock.startTime} - ${nextBlock.endTime} / ${formatDuration(nextBlock.duration)}` : "Build a weekly rhythm"}
          </span>
        </Link>
        <Link className="interactive-card" href="/revision">
          <span className="eyebrow text-forge-muted">Revision pressure</span>
          <span className="mt-3 block text-xl font-bold text-forge-text">{revisionsDue + revisionsOverdue}</span>
          <span className="mt-2 block text-base text-forge-muted">
            {revisionsOverdue > 0 ? `${revisionsOverdue} overdue` : `${revisionsDue} due today`}
          </span>
        </Link>
        <Link className="interactive-card" href="/topics">
          <span className="eyebrow text-forge-muted">Syllabus</span>
          <span className="mt-3 block text-xl font-bold text-forge-text">{syllabusProgress}% complete</span>
          <div className="mt-3">
            <ProgressBar value={syllabusProgress} />
          </div>
        </Link>
        <Link className="interactive-card" href="/habits">
          <span className="eyebrow text-forge-muted">Today&apos;s habits</span>
          <span className="mt-3 block text-xl font-bold text-forge-text">
            {habitsCompletedToday}/{totalHabits}
          </span>
          <span className="mt-2 block text-base text-forge-muted">
            {totalHabits > 0 ? "Checked in today" : "Create daily anchors"}
          </span>
        </Link>
      </div>
    </section>
  );
}
