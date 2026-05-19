import Link from "next/link";
import LoadingState from "@/components/LoadingState";
import SectionHeader from "@/components/SectionHeader";
import type { MarksProgressSummary } from "@/lib/marks";

interface MarksProgressSnapshotProps {
  summary: MarksProgressSummary;
  loading: boolean;
}

function SnapshotCard({
  label,
  value,
  detail,
  href = "/marks"
}: {
  label: string;
  value: string | number;
  detail: string;
  href?: string;
}) {
  return (
    <Link className="interactive-card" href={href}>
      <span className="eyebrow text-forge-muted">{label}</span>
      <span className="mt-3 block text-2xl font-bold text-forge-text">{value}</span>
      <span className="mt-2 block text-base text-forge-muted">{detail}</span>
    </Link>
  );
}

export default function MarksProgressSnapshot({ summary, loading }: MarksProgressSnapshotProps) {
  if (loading) {
    return (
      <section className="card p-6 sm:p-8">
        <LoadingState label="Loading marks progress" mode="inline" />
      </section>
    );
  }

  return (
    <section className="card p-6 sm:p-8">
      <SectionHeader
        eyebrow="Marks progress"
        title="Latest scores and mistake focus."
        action={<Link className="btn-ghost" href="/marks">Open marks</Link>}
      />
      {summary.totalTests === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-forge-line bg-white/70 p-6">
          <p className="font-bold text-forge-text">No marks recorded yet</p>
          <p className="mt-2 text-base text-forge-muted">Add a result to see average score, subject signals, and mistake patterns.</p>
          <Link className="btn-primary mt-4" href="/marks">Add result</Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <SnapshotCard
            label="Latest test"
            value={summary.latestEntry ? `${summary.latestEntry.percentage}%` : "None"}
            detail={summary.latestEntry?.testName ?? "Add your first result"}
          />
          <SnapshotCard
            label="Average score"
            value={`${summary.overallAverage}%`}
            detail={`${summary.totalTests} recorded result${summary.totalTests === 1 ? "" : "s"}`}
          />
          <SnapshotCard
            label="Best subject"
            value={summary.bestSubject?.subjectName ?? "No signal"}
            detail={summary.bestSubject ? `${summary.bestSubject.averagePercentage}% average` : "Needs subject-linked marks"}
          />
          <SnapshotCard
            label="Weak subject"
            value={summary.weakestSubject?.subjectName ?? "No signal"}
            detail={summary.weakestSubject ? `${summary.weakestSubject.averagePercentage}% average` : "Needs subject-linked marks"}
          />
          <SnapshotCard
            label="Trend"
            value={summary.trend}
            detail={summary.trend === "Not enough data" ? "Record one more result" : "Latest two results"}
          />
          <SnapshotCard
            label="Mistake focus"
            value={summary.topMistakeTag ?? "No tags"}
            detail={summary.topMistakeTag ? "Most repeated tag" : "Add mistake tags"}
          />
        </div>
      )}
    </section>
  );
}
