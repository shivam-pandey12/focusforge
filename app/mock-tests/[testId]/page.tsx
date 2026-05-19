"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import EmptyState from "@/components/EmptyState";
import FeatureLockedCard from "@/components/FeatureLockedCard";
import LoadingState from "@/components/LoadingState";
import MetricCard from "@/components/MetricCard";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import StatusMessage from "@/components/StatusMessage";
import { useAuth } from "@/hooks/useAuth";
import { useBacklogItems } from "@/hooks/useBacklogItems";
import { useDeferredDataStart } from "@/hooks/useDeferredDataStart";
import { useMockTest } from "@/hooks/useMockTest";
import { usePlan } from "@/hooks/usePlan";
import { useRevisions } from "@/hooks/useRevisions";
import { useSyllabus } from "@/hooks/useSyllabus";
import { formatShortDate, getTodayDateKey } from "@/lib/date";
import { isAtLimit } from "@/lib/plans";
import {
  calculateMockAnalytics,
  getMockRepairSuggestions,
  getMockWeakAreas,
  revisionTypeForMistake,
  type MockRepairSuggestion
} from "@/lib/mockAnalytics";
import type { MockMistakeTag, MockTestResult } from "@/types";

function focusHref(test: MockTestResult, suggestion?: MockRepairSuggestion): string {
  const params = new URLSearchParams();
  params.set("sourceType", "mockTest");
  params.set("sourceId", test.id);
  params.set("targetTitle", suggestion?.title ?? `Review ${test.title}`);

  if (suggestion?.subjectId ?? test.subjectId) {
    params.set("subjectId", suggestion?.subjectId ?? test.subjectId ?? "");
  }

  if (suggestion?.subject ?? test.subject) {
    params.set("subject", suggestion?.subject ?? test.subject ?? "");
  }

  if (suggestion?.topicId) {
    params.set("topicId", suggestion.topicId);
  }

  return `/focus?${params.toString()}`;
}

function mistakeCounts(test: MockTestResult): [MockMistakeTag, number][] {
  const counts = new Map<MockMistakeTag, number>();

  [...test.mistakeTags, ...test.topicAnalyses.flatMap((item) => item.mistakeTags)].forEach((tag) => {
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  });

  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function MockReportContent() {
  const params = useParams<{ testId: string }>();
  const testId = Array.isArray(params.testId) ? params.testId[0] : params.testId;
  const { user, loading: authLoading } = useAuth();
  const dataReady = useDeferredDataStart();
  const plan = usePlan(dataReady ? user?.uid : undefined);
  const hasAccess = plan.hasFeature("mockTests") && plan.hasFeature("advancedMockAnalytics");
  const testState = useMockTest(dataReady && hasAccess ? user?.uid : undefined, testId);
  const syllabus = useSyllabus(dataReady && hasAccess ? user?.uid : undefined);
  const backlog = useBacklogItems(dataReady && hasAccess ? user?.uid : undefined);
  const revisions = useRevisions(dataReady && hasAccess ? user?.uid : undefined);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const test = testState.test;
  const weakAreas = test ? getMockWeakAreas(test) : [];
  const suggestions = test ? getMockRepairSuggestions(test) : [];
  const analytics = test ? calculateMockAnalytics([test]) : null;
  const activeRevisions = revisions.plans.filter((planItem) => planItem.status !== "Done" && planItem.status !== "Skipped").length;
  const error = testState.error ?? syllabus.error ?? backlog.error ?? revisions.error;

  if (authLoading || !user) {
    return <LoadingState label="Loading mock report" />;
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
            feature="advancedMockAnalytics"
            description="Mock reports and repair suggestions are available on Forge Pro and Forge Elite."
          />
        </main>
      </>
    );
  }

  async function createBacklog(suggestion: MockRepairSuggestion) {
    setActionError(null);
    setSuccess(null);

    if (!test) {
      return;
    }

    if (isAtLimit(backlog.items.length, plan.limits.backlogItemsLimit)) {
      setActionError("Your backlog limit is full. Clear or edit existing backlog items first, or upgrade for more recovery space.");
      return;
    }

    try {
      await backlog.createItem({
        title: suggestion.topicName || suggestion.chapterName || suggestion.title,
        subjectId: suggestion.subjectId,
        subject: suggestion.subject || test.subject || "Mock test",
        subjectColor: suggestion.subjectColor,
        subjectIcon: suggestion.subjectIcon,
        chapterId: suggestion.chapterId,
        chapterName: suggestion.chapterName,
        topicId: suggestion.topicId,
        topicName: suggestion.topicName,
        mockTestId: test.id,
        sourceType: "mockTest",
        sourceId: test.id,
        backlogLevel: suggestion.backlogLevel,
        reason: suggestion.type === "Create Backlog" ? "Low Marks" : "Weak Concept",
        targetFinishDate: "",
        estimatedMinutes: suggestion.recommendedDuration,
        status: "Not Started",
        priority: suggestion.priority,
        notes: `From ${test.title}: ${suggestion.reason}`
      });

      setSuccess("Backlog item created from this mock weakness.");
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : "Could not create backlog item.");
    }
  }

  async function createRevision(suggestion: MockRepairSuggestion) {
    setActionError(null);
    setSuccess(null);

    if (!test) {
      return;
    }

    if (isAtLimit(activeRevisions, plan.limits.revisionPlansLimit)) {
      setActionError("Your active revision limit is full. Complete or skip an existing revision first, or upgrade for a larger planner.");
      return;
    }

    try {
      await revisions.createPlan({
        title: suggestion.topicName || suggestion.chapterName || suggestion.title,
        subjectId: suggestion.subjectId,
        subject: suggestion.subject || test.subject || "Mock test",
        chapterId: suggestion.chapterId,
        chapterName: suggestion.chapterName,
        topicId: suggestion.topicId,
        topicName: suggestion.topicName,
        mockTestId: test.id,
        sourceType: "mockTest",
        sourceId: test.id,
        revisionType: suggestion.revisionType || revisionTypeForMistake(suggestion.mistakeTags),
        priority: suggestion.priority,
        status: "Pending",
        dueDate: getTodayDateKey(),
        notes: `From ${test.title}: ${suggestion.reason}`
      });

      setSuccess("Revision plan created from this mock weakness.");
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : "Could not create revision item.");
    }
  }

  return (
    <>
      <Navbar email={user.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Mock report"
          title={test?.title ?? "Mock report"}
          subtitle={test ? `${formatShortDate(test.testDate)} / ${test.examType ?? "Practice"} / repair suggestions are rules-based and explicit.` : "Loading mock report."}
          action={<Link className="btn-secondary" href="/mock-tests">Back to mocks</Link>}
        />

        {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
        {actionError ? <StatusMessage tone="error">{actionError}</StatusMessage> : null}
        {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}

        {testState.loading || syllabus.loading || backlog.loading || revisions.loading || !dataReady ? (
          <LoadingState label="Loading mock report" mode="inline" />
        ) : !test ? (
          <EmptyState title="Mock test not found" description="This report may have been deleted, or it belongs to a different account." />
        ) : (
          <>
            <section className="grid gap-5 md:grid-cols-5">
              <MetricCard label="Score" value={`${test.percentage}%`} detail={`${test.score}/${test.totalMarks}`} tone="gold" />
              <MetricCard label="Accuracy" value={`${test.accuracy}%`} detail={`${test.correctAnswers}/${test.attemptedQuestions} attempted correct`} />
              <MetricCard label="Skipped" value={test.skippedQuestions} detail={`${test.totalQuestions} total questions`} />
              <MetricCard label="Time" value={`${test.timeTakenMinutes}m`} detail={test.timeAnalysis?.timePressure ? "Time pressure flagged" : "No time pressure flag"} />
              <MetricCard label="Weak signals" value={weakAreas.length} detail={analytics?.biggestMistakeType ?? "No top mistake"} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
              <article className="card p-6 sm:p-8">
                <SectionHeader eyebrow="Subject performance" title="Where the mock moved" />
                <div className="mt-5 grid gap-3">
                  {test.subjectBreakdowns.length === 0 ? (
                    <p className="text-base text-forge-muted">No subject breakdown was added. The overall score is still preserved.</p>
                  ) : (
                    test.subjectBreakdowns.map((row) => (
                      <div className="rounded-3xl border border-forge-line bg-white p-4" key={row.id}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-bold text-forge-text">{row.subject}</p>
                            <p className="mt-1 text-sm font-semibold text-forge-muted">{row.score}/{row.totalMarks} / {row.accuracy}% accuracy</p>
                          </div>
                          <span className={row.percentage < 55 ? "badge badge-warning" : "badge badge-open"}>{row.percentage}%</span>
                        </div>
                        <div className="mt-3 h-3 overflow-hidden rounded-full bg-forge-surfaceAlt">
                          <span className="block h-full rounded-full bg-forge-gold" style={{ width: `${Math.min(100, row.percentage)}%` }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="card p-6 sm:p-8">
                <SectionHeader eyebrow="Mistake pattern" title="What repeated" />
                <div className="mt-5 grid gap-3">
                  {mistakeCounts(test).length === 0 ? (
                    <p className="text-base text-forge-muted">No mistake tags were recorded for this mock.</p>
                  ) : (
                    mistakeCounts(test).map(([tag, count]) => (
                      <div className="flex items-center justify-between rounded-2xl border border-forge-line bg-white p-4" key={tag}>
                        <span className="font-bold text-forge-text">{tag}</span>
                        <span className="badge">{count}</span>
                      </div>
                    ))
                  )}
                  {test.timeAnalysis?.notes ? <p className="text-sm leading-6 text-forge-muted">{test.timeAnalysis.notes}</p> : null}
                </div>
              </article>
            </section>

            <section className="card p-6 sm:p-8">
              <SectionHeader eyebrow="Weak chapters/topics" title="Why this is weak" />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {weakAreas.length === 0 ? (
                  <p className="text-base text-forge-muted">No weak area was detected from this mock.</p>
                ) : (
                  weakAreas.map((area) => (
                    <article className="rounded-3xl border border-forge-line bg-white p-5" key={area.id}>
                      <span className={area.performanceLevel === "Critical" ? "badge badge-warning" : "badge badge-open"}>{area.performanceLevel}</span>
                      <h3 className="mt-3 text-lg font-bold text-forge-text">{area.topicName || area.chapterName || area.subject}</h3>
                      <p className="mt-2 text-sm leading-6 text-forge-muted">{area.reason}</p>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="card p-6 sm:p-8">
              <SectionHeader eyebrow="Recommended repair" title="Explicit next actions" />
              <div className="mt-5 grid gap-4">
                {suggestions.length === 0 ? (
                  <EmptyState title="No repair suggestions yet" description="Add subject rows, weakness rows, mistake tags, or time pressure notes to generate transparent repairs." />
                ) : (
                  suggestions.map((suggestion) => (
                    <article className="rounded-3xl border border-forge-line bg-white p-5" key={suggestion.id}>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <span className={suggestion.priority === "High" ? "badge badge-warning" : "badge"}>{suggestion.priority}</span>
                            <span className="badge">{suggestion.recommendedDuration}m</span>
                            <span className="badge">{suggestion.type}</span>
                          </div>
                          <h3 className="mt-3 text-lg font-bold text-forge-text">{suggestion.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-forge-muted">{suggestion.reason}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <button className="btn-secondary" type="button" onClick={() => createBacklog(suggestion)}>Create backlog</button>
                          <button className="btn-secondary" type="button" onClick={() => createRevision(suggestion)}>Create revision</button>
                          <Link className="btn-primary" href={focusHref(test, suggestion)}>Start focus</Link>
                          <Link className="btn-ghost" href="/battle-plan">Open battle plan</Link>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}

export default function MockReportPage() {
  return (
    <AuthGuard>
      <MockReportContent />
    </AuthGuard>
  );
}
