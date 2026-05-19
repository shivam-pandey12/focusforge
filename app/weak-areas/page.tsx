"use client";

import AuthGuard from "@/components/AuthGuard";
import EmptyState from "@/components/EmptyState";
import FeatureLockedCard from "@/components/FeatureLockedCard";
import LoadingState from "@/components/LoadingState";
import MetricCard from "@/components/MetricCard";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import StatusMessage from "@/components/StatusMessage";
import { useAuth } from "@/hooks/useAuth";
import { useDeferredDataStart } from "@/hooks/useDeferredDataStart";
import { usePlan } from "@/hooks/usePlan";
import { useWeakAreas } from "@/hooks/useWeakAreas";
import type { WeakAreaStatus } from "@/types";

const statusTone: Record<WeakAreaStatus, string> = {
  "Strong area": "badge badge-done",
  "Good progress": "badge badge-open",
  "Needs attention": "badge border-amber-200 bg-amber-50 text-amber-800",
  "Falling behind": "badge border-red-200 bg-red-50 text-red-700"
};

function WeakAreasContent() {
  const { user, loading: authLoading } = useAuth();
  const dataReady = useDeferredDataStart();
  const plan = usePlan(dataReady ? user?.uid : undefined);
  const hasAccess = plan.hasFeature("weakAreas");
  const weakAreas = useWeakAreas(dataReady && hasAccess ? user?.uid : undefined);
  const needsAttention = weakAreas.weakAreas.filter(
    (area) => area.status === "Needs attention" || area.status === "Falling behind"
  ).length;
  const strongAreas = weakAreas.weakAreas.filter((area) => area.status === "Strong area").length;

  if (authLoading || !user) {
    return <LoadingState label="Loading weak areas" />;
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
            feature="weakAreas"
            description="Weak area detection is part of Forge Elite. Existing subject, revision, and test data is preserved for when you unlock advanced insights."
          />
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar email={user.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Weak areas"
          title="Rule-based attention signals."
          subtitle="FocusForge compares revisions, syllabus progress, mock tests, study time, and unfinished tasks. No AI, no certainty theater."
        />

        {weakAreas.error ? <StatusMessage tone="error">{weakAreas.error}</StatusMessage> : null}

        <section className="grid gap-5 md:grid-cols-3">
          <MetricCard label="Subjects scanned" value={weakAreas.weakAreas.length} />
          <MetricCard label="Need attention" value={needsAttention} tone="warning" />
          <MetricCard label="Strong areas" value={strongAreas} tone="success" />
        </section>

        {!dataReady || weakAreas.loading ? (
          <LoadingState label="Checking study signals" mode="inline" />
        ) : weakAreas.weakAreas.length === 0 ? (
          <EmptyState
            title="Not enough subject data yet"
            description="Add subjects, sessions, revisions, tasks, or mock tests and weak-area insights will appear here."
          />
        ) : (
          <section className="grid gap-4">
            {weakAreas.weakAreas.map((area) => (
              <article className="card p-6 sm:p-8" key={area.subject}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="eyebrow">Subject</p>
                    <h2 className="text-2xl font-bold text-forge-text">{area.subject}</h2>
                  </div>
                  <span className={statusTone[area.status]}>{area.status}</span>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_24rem]">
                  <div className="rounded-3xl border border-forge-line bg-white p-5">
                    <p className="text-sm font-bold uppercase tracking-[0.14em] text-forge-muted">Reasons</p>
                    <ul className="mt-3 space-y-2 text-base text-forge-muted">
                      {area.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-3xl border border-forge-line bg-forge-surface p-5">
                    <p className="text-sm font-bold uppercase tracking-[0.14em] text-forge-muted">Next action</p>
                    <p className="mt-3 text-base leading-7 text-forge-text">{area.nextAction}</p>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </>
  );
}

export default function WeakAreasPage() {
  return (
    <AuthGuard>
      <WeakAreasContent />
    </AuthGuard>
  );
}
