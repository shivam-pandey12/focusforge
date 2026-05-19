"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/LoadingState";
import MetricCard from "@/components/MetricCard";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import StatusMessage from "@/components/StatusMessage";
import { useAssignments } from "@/hooks/useAssignments";
import { useAuth } from "@/hooks/useAuth";
import { useBacklogItems } from "@/hooks/useBacklogItems";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useDailyBattlePlan } from "@/hooks/useDailyBattlePlan";
import { useDeferredDataStart } from "@/hooks/useDeferredDataStart";
import { useExamSchedules } from "@/hooks/useExamSchedules";
import { useMarksEntries } from "@/hooks/useMarksEntries";
import { useMockTests } from "@/hooks/useMockTests";
import { usePlan } from "@/hooks/usePlan";
import { useRevisions } from "@/hooks/useRevisions";
import { useSyllabus } from "@/hooks/useSyllabus";
import { useTimetable } from "@/hooks/useTimetable";
import { useUserSessions } from "@/hooks/useUserSessions";
import {
  AVAILABLE_STUDY_TIME_OPTIONS,
  generateDailyBattlePlanItems,
  hasBattlePlanProgress
} from "@/lib/battlePlan";
import { formatDuration, getTodayDateKey } from "@/lib/date";
import { calculateMockAnalytics } from "@/lib/mockAnalytics";
import type { DailyBattlePlanItem } from "@/types";

function focusHref(item: DailyBattlePlanItem, planId?: string): string {
  const params = new URLSearchParams();

  if (planId) {
    params.set("battlePlanId", planId);
    params.set("battlePlanItemId", item.id);
  }

  if (item.sourceType === "assignment" && item.sourceId) {
    params.set("assignmentId", item.sourceId);
  } else if (item.sourceType === "revision" && item.sourceId) {
    params.set("revisionPlanId", item.sourceId);
  } else if (item.sourceType === "backlog" && item.sourceId) {
    params.set("backlogItemId", item.sourceId);
  } else if (item.sourceType === "topic" && item.sourceId) {
    params.set("topicId", item.sourceId);
  } else if (item.sourceType === "marks" && item.subjectId) {
    params.set("subjectId", item.subjectId);
  } else {
    params.set("targetTitle", item.title);
    if (item.subject) {
      params.set("subject", item.subject);
    }
    if (item.subjectId) {
      params.set("subjectId", item.subjectId);
    }
    params.set("sourceType", item.sourceType);
    if (item.sourceId) {
      params.set("sourceId", item.sourceId);
    }
  }

  return `/focus?${params.toString()}`;
}

function BattlePlanContent() {
  const { user, loading: authLoading } = useAuth();
  const dataReady = useDeferredDataStart();
  const today = getTodayDateKey();
  const planAccess = usePlan(user?.uid);
  const canMockTests = planAccess.hasFeature("mockTests") && planAccess.hasFeature("advancedMockAnalytics");
  const syllabus = useSyllabus(dataReady ? user?.uid : undefined);
  const assignments = useAssignments(dataReady ? user?.uid : undefined);
  const backlog = useBacklogItems(dataReady ? user?.uid : undefined);
  const exams = useExamSchedules(dataReady ? user?.uid : undefined);
  const revisions = useRevisions(dataReady ? user?.uid : undefined);
  const marks = useMarksEntries(dataReady ? user?.uid : undefined, { subjects: syllabus.subjects });
  const mockTests = useMockTests(dataReady && canMockTests ? user?.uid : undefined);
  const sessions = useUserSessions(dataReady ? user?.uid : undefined);
  const timetable = useTimetable(dataReady ? user?.uid : undefined);
  const battlePlan = useDailyBattlePlan(dataReady ? user?.uid : undefined, today);
  const { confirm, confirmDialog } = useConfirmDialog();
  const [availableMinutes, setAvailableMinutes] = useState(120);
  const [customMinutes, setCustomMinutes] = useState(120);
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const maxItems = Number.isFinite(planAccess.limits.battlePlanItemsLimit)
    ? planAccess.limits.battlePlanItemsLimit
    : 6;
  const currentAvailableMinutes = useCustomTime ? Math.max(30, Math.round(customMinutes || 120)) : availableMinutes;
  const mockAnalytics = useMemo(() => calculateMockAnalytics(mockTests.tests), [mockTests.tests]);

  useEffect(() => {
    if (battlePlan.plan?.availableMinutes) {
      setAvailableMinutes(battlePlan.plan.availableMinutes);
      setCustomMinutes(battlePlan.plan.availableMinutes);
      setUseCustomTime(!AVAILABLE_STUDY_TIME_OPTIONS.some((option) => option.minutes === battlePlan.plan?.availableMinutes));
    }
  }, [battlePlan.plan?.availableMinutes]);

  const generatedPreview = useMemo(() => {
    if (!dataReady) {
      return [];
    }

    return generateDailyBattlePlanItems({
      date: today,
      availableMinutes: currentAvailableMinutes,
      maxItems,
      subjects: syllabus.subjects,
      chapters: syllabus.chapters,
      topics: syllabus.topics,
      assignments: assignments.assignments,
      exams: exams.exams,
      revisions: revisions.plans,
      backlogItems: backlog.items,
      marksSummary: marks.summary,
      mockAnalytics: canMockTests ? mockAnalytics : undefined,
      sessions: sessions.sessions,
      todayBlocks: timetable.todayBlocks
    });
  }, [
    assignments.assignments,
    backlog.items,
    currentAvailableMinutes,
    dataReady,
    exams.exams,
    marks.summary,
    mockAnalytics,
    canMockTests,
    maxItems,
    revisions.plans,
    sessions.sessions,
    syllabus.chapters,
    syllabus.subjects,
    syllabus.topics,
    timetable.todayBlocks,
    today
  ]);
  const displayedItems = battlePlan.plan?.items ?? generatedPreview;
  const totalPlannedMinutes = displayedItems.reduce((total, item) => total + (item.status === "Skipped" ? 0 : item.recommendedDuration), 0);
  const doneCount = displayedItems.filter((item) => item.status === "Done").length;
  const skippedCount = displayedItems.filter((item) => item.status === "Skipped").length;
  const loading =
    !dataReady ||
    syllabus.loading ||
    assignments.loading ||
    backlog.loading ||
    exams.loading ||
    revisions.loading ||
    marks.loading ||
    mockTests.loading ||
    sessions.loading ||
    timetable.loading ||
    battlePlan.loading;
  const error =
    syllabus.error ??
    assignments.error ??
    backlog.error ??
    exams.error ??
    revisions.error ??
    marks.error ??
    mockTests.error ??
    sessions.error ??
    timetable.error ??
    battlePlan.error;

  if (authLoading || !user) {
    return <LoadingState label="Loading battle plan" />;
  }

  async function generatePlan(forceReplace = false) {
    setActionError(null);
    setSuccess(null);

    if (battlePlan.plan && hasBattlePlanProgress(battlePlan.plan) && !forceReplace) {
      const confirmed = await confirm({
        eyebrow: "Regenerate plan",
        title: "Replace today's progress?",
        description: "Today's plan already has Done or Skipped items. Regenerating will replace that progress, but it will not modify homework, revision, backlog, or exam records.",
        confirmLabel: "Regenerate plan",
        tone: "warning"
      });

      if (!confirmed) {
        return;
      }
    }

    setSaving(true);

    try {
      const items = generateDailyBattlePlanItems({
        date: today,
        availableMinutes: currentAvailableMinutes,
        maxItems,
        subjects: syllabus.subjects,
        chapters: syllabus.chapters,
        topics: syllabus.topics,
        assignments: assignments.assignments,
        exams: exams.exams,
        revisions: revisions.plans,
        backlogItems: backlog.items,
        marksSummary: marks.summary,
        mockAnalytics: canMockTests ? mockAnalytics : undefined,
        sessions: sessions.sessions,
        todayBlocks: timetable.todayBlocks
      });

      await battlePlan.savePlan({
        date: today,
        availableMinutes: currentAvailableMinutes,
        items
      });
      setSuccess(battlePlan.plan ? "Battle plan regenerated." : "Battle plan generated.");
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : "Could not generate battle plan.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(itemId: string, status: "Pending" | "Done" | "Skipped") {
    setActionError(null);
    setSuccess(null);

    try {
      if (!battlePlan.plan) {
        await generatePlan(true);
      }
      await battlePlan.markItemStatus(itemId, status);
      setSuccess(status === "Pending" ? "Plan item reopened." : `Plan item marked ${status.toLowerCase()}.`);
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : "Could not update battle plan item.");
    }
  }

  function handleTimeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void generatePlan();
  }

  return (
    <>
      <Navbar email={user.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Daily battle plan"
          title="Today&apos;s best moves, without the noise."
          subtitle="A transparent rules-based plan using homework, exams, revision, backlog, marks, timetable, and available time."
          action={
            <div className="flex flex-wrap gap-2">
              <Link className="btn-secondary" href="/backlog">Open backlog</Link>
              <Link className="btn-secondary" href="/docs#battle-plan-rules">Battle plan help</Link>
            </div>
          }
        />

        {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
        {actionError ? <StatusMessage tone="error">{actionError}</StatusMessage> : null}
        {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}

        <section className="grid gap-5 md:grid-cols-4">
          <MetricCard label="Plan status" value={battlePlan.plan ? "Saved" : "Preview"} detail={battlePlan.plan ? today : "Generate to save progress"} tone="gold" />
          <MetricCard label="Available time" value={formatDuration(currentAvailableMinutes)} detail={`${maxItems} item${maxItems === 1 ? "" : "s"} max today`} />
          <MetricCard label="Plan load" value={formatDuration(totalPlannedMinutes)} detail="Skipped items excluded" />
          <MetricCard label="Progress" value={`${doneCount}/${displayedItems.length}`} detail={`${skippedCount} skipped`} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[24rem_1fr]">
          <form className="card space-y-5 p-6 sm:p-8" onSubmit={handleTimeSubmit}>
            <SectionHeader eyebrow="Available time" title="Shape today&apos;s plan" />
            <div className="grid gap-3">
              {AVAILABLE_STUDY_TIME_OPTIONS.map((option) => (
                <button
                  className={!useCustomTime && availableMinutes === option.minutes ? "btn-primary justify-center" : "btn-secondary justify-center"}
                  key={option.minutes}
                  type="button"
                  onClick={() => {
                    setUseCustomTime(false);
                    setAvailableMinutes(option.minutes);
                  }}
                >
                  {option.label}
                </button>
              ))}
              <button
                className={useCustomTime ? "btn-primary justify-center" : "btn-secondary justify-center"}
                type="button"
                onClick={() => setUseCustomTime(true)}
              >
                Custom
              </button>
            </div>
            {useCustomTime ? (
              <label className="grid gap-2">
                <span className="label">Custom minutes</span>
                <input className="input" min={30} max={480} type="number" value={customMinutes} onChange={(event) => setCustomMinutes(Number(event.target.value))} />
              </label>
            ) : null}
            <div className="rounded-2xl border border-forge-line bg-forge-surfaceAlt/60 p-4">
              <p className="font-bold text-forge-text">Why these items?</p>
              <p className="mt-2 text-sm leading-6 text-forge-muted">
                The score favors overdue homework, close exams, overdue revision, heavy backlog, weak marks signals, target dates, and tasks that fit your available time.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" disabled={saving || loading} type="submit">
                {saving ? "Generating" : battlePlan.plan ? "Regenerate plan" : "Generate today"}
              </button>
              <Link className="btn-ghost" href="/focus">Start focus</Link>
            </div>
          </form>

          <section className="card p-6 sm:p-8">
            <SectionHeader
              eyebrow={battlePlan.plan ? "Saved plan" : "Preview"}
              title="Today&apos;s best moves"
              subtitle={battlePlan.plan ? "Done and skipped states are saved for today." : "Generate the plan to save Done or Skipped progress."}
            />

            {loading ? (
              <div className="mt-6"><LoadingState label="Preparing recommendations" mode="inline" /></div>
            ) : displayedItems.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="No recommendations yet"
                  description="Add backlog, homework, revision, exams, or subject-linked marks to generate a useful plan."
                  action={
                    <div className="flex flex-wrap gap-2">
                      <Link className="btn-primary" href="/backlog">Add backlog</Link>
                      <Link className="btn-ghost" href="/homework">Add homework</Link>
                      <Link className="btn-ghost" href="/revision">Add revision</Link>
                      <Link className="btn-ghost" href="/exams">Add exam</Link>
                      <Link className="btn-ghost" href="/marks">Add marks</Link>
                    </div>
                  }
                />
              </div>
            ) : (
              <div className="mt-6 grid gap-4">
                {displayedItems.map((item, index) => (
                  <article className={item.overflow ? "rounded-3xl border border-dashed border-forge-line bg-white p-5" : "rounded-3xl border border-forge-line bg-white p-5 shadow-soft"} key={item.id}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className="badge">{index + 1}</span>
                          <span className={item.priority === "High" ? "badge badge-warning" : "badge"}>{item.priority}</span>
                          <span className={item.status === "Done" ? "badge badge-done" : item.status === "Skipped" ? "badge badge-warning" : "badge badge-open"}>{item.status}</span>
                          {item.overflow ? <span className="badge">Extra if time remains</span> : null}
                        </div>
                        <h2 className="mt-3 text-xl font-bold text-forge-text">{item.title}</h2>
                        <p className="mt-1 text-sm font-semibold text-forge-muted">
                          {[item.type, item.subject, formatDuration(item.recommendedDuration)].filter(Boolean).join(" / ")}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-forge-muted"><span className="font-bold text-forge-text">Why:</span> {item.reason}</p>
                        <p className="mt-1 text-sm leading-6 text-forge-muted"><span className="font-bold text-forge-text">Move:</span> {item.suggestedAction}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <Link className="btn-primary" href={focusHref(item, battlePlan.plan?.id)}>Start focus</Link>
                        <Link className="btn-ghost" href={item.href}>Open source</Link>
                        {battlePlan.plan ? (
                          item.status === "Pending" ? (
                            <>
                              <button className="btn-secondary" type="button" onClick={() => updateStatus(item.id, "Done")}>Done</button>
                              <button className="btn-ghost" type="button" onClick={() => updateStatus(item.id, "Skipped")}>Skip</button>
                            </>
                          ) : (
                            <button className="btn-ghost" type="button" onClick={() => updateStatus(item.id, "Pending")}>Reopen</button>
                          )
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </main>
      {confirmDialog}
    </>
  );
}

export default function BattlePlanPage() {
  return (
    <AuthGuard>
      <BattlePlanContent />
    </AuthGuard>
  );
}
