import Link from "next/link";
import LoadingState from "@/components/LoadingState";
import SectionHeader from "@/components/SectionHeader";
import type { MockTestResult, StudyJournalEntry, WeakAreaInsight } from "@/types";
import type { MockAnalyticsSummary } from "@/lib/mockAnalytics";
import type { StudyGoalWithProgress } from "@/hooks/useGoals";

interface PerformanceSnapshotProps {
  productivityScore: number;
  topWeakArea: WeakAreaInsight | null;
  nearestGoal: StudyGoalWithProgress | null;
  recentMockTest: MockTestResult | null;
  mockSummary: MockAnalyticsSummary;
  journalPrompt: boolean;
  recentJournal: StudyJournalEntry | null;
  loading: boolean;
}

export default function PerformanceSnapshot({
  productivityScore,
  topWeakArea,
  nearestGoal,
  recentMockTest,
  mockSummary,
  journalPrompt,
  recentJournal,
  loading
}: PerformanceSnapshotProps) {
  if (loading) {
    return (
      <section className="card p-6 sm:p-8">
        <LoadingState label="Loading performance snapshot" mode="inline" />
      </section>
    );
  }

  return (
    <section className="card p-6 sm:p-8">
      <SectionHeader
        eyebrow="Performance snapshot"
        title="Signals worth checking."
        action={<Link className="btn-ghost" href="/analytics">Open analytics</Link>}
      />
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link className="interactive-card" href="/analytics">
          <span className="eyebrow text-forge-muted">Productivity</span>
          <span className="mt-3 block text-3xl font-bold text-forge-text">{productivityScore}</span>
          <span className="mt-2 block text-base text-forge-muted">Daily score out of 100</span>
        </Link>
        <Link className="interactive-card" href="/weak-areas">
          <span className="eyebrow text-forge-muted">Weak area</span>
          <span className="mt-3 block text-xl font-bold text-forge-text">{topWeakArea?.subject ?? "No signal yet"}</span>
          <span className="mt-2 block text-base text-forge-muted">{topWeakArea?.status ?? "Add more subject data"}</span>
        </Link>
        <Link className="interactive-card" href="/goals">
          <span className="eyebrow text-forge-muted">Nearest goal</span>
          <span className="mt-3 block text-xl font-bold text-forge-text">{nearestGoal?.title ?? "No goal yet"}</span>
          <span className="mt-2 block text-base text-forge-muted">
            {nearestGoal ? `${nearestGoal.progress.percent}% complete` : "Create a milestone"}
          </span>
        </Link>
        <Link className="interactive-card" href={journalPrompt ? "/journal" : "/mock-tests"}>
          <span className="eyebrow text-forge-muted">{journalPrompt ? "Journal prompt" : "Mock result"}</span>
          <span className="mt-3 block text-xl font-bold text-forge-text">
            {journalPrompt ? "Reflect today" : recentMockTest ? `${recentMockTest.percentage}%` : "No tests yet"}
          </span>
          <span className="mt-2 block text-base text-forge-muted">
            {journalPrompt
              ? "Capture the session while it is fresh"
              : recentMockTest?.title ?? recentJournal?.title ?? "Add practice data"}
          </span>
        </Link>
        <Link className="interactive-card" href={recentMockTest ? `/mock-tests/${recentMockTest.id}` : "/mock-tests"}>
          <span className="eyebrow text-forge-muted">Mock trend</span>
          <span className="mt-3 block text-xl font-bold text-forge-text">{mockSummary.scoreTrend}</span>
          <span className="mt-2 block text-base text-forge-muted">
            {mockSummary.weakestSubject
              ? `Weakest: ${mockSummary.weakestSubject.subject}`
              : recentMockTest ? "Add subject breakdowns for deeper signals" : "Record a mock to begin"}
          </span>
        </Link>
        <Link className="interactive-card" href={recentMockTest ? `/mock-tests/${recentMockTest.id}` : "/mock-tests"}>
          <span className="eyebrow text-forge-muted">Mistake pattern</span>
          <span className="mt-3 block text-xl font-bold text-forge-text">{mockSummary.biggestMistakeType ?? "No pattern"}</span>
          <span className="mt-2 block text-base text-forge-muted">
            {mockSummary.nextRepairSuggestion?.title ?? "Tag mistakes in mock reports"}
          </span>
        </Link>
      </div>
    </section>
  );
}
