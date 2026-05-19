"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import StatsCards from "@/components/StatsCards";
import StreakCard from "@/components/StreakCard";
import TaskForm from "@/components/TaskForm";
import TaskList from "@/components/TaskList";
import LoadingState from "@/components/LoadingState";
import MarksProgressSnapshot from "@/components/MarksProgressSnapshot";
import PageHeader from "@/components/PageHeader";
import PerformanceSnapshot from "@/components/PerformanceSnapshot";
import PlanBadge from "@/components/PlanBadge";
import PlanningOverview from "@/components/PlanningOverview";
import StatusMessage from "@/components/StatusMessage";
import StudentPlannerSnapshot from "@/components/StudentPlannerSnapshot";
import TodaySetup from "@/components/TodaySetup";
import { useActiveFocusSession } from "@/hooks/useActiveFocusSession";
import { useAuth } from "@/hooks/useAuth";
import { useBacklogItems } from "@/hooks/useBacklogItems";
import { useDailyBattlePlan } from "@/hooks/useDailyBattlePlan";
import { useDashboardSummaries } from "@/hooks/useDashboardSummaries";
import { useDeferredDataStart } from "@/hooks/useDeferredDataStart";
import { useMarksEntries } from "@/hooks/useMarksEntries";
import { usePhase5DashboardSummaries } from "@/hooks/usePhase5DashboardSummaries";
import { usePhase6DashboardSummaries } from "@/hooks/usePhase6DashboardSummaries";
import { usePlan } from "@/hooks/usePlan";
import { useSessions } from "@/hooks/useSessions";
import { useStudentPlannerSummaries } from "@/hooks/useStudentPlannerSummaries";
import { useStreak } from "@/hooks/useStreak";
import { useSyllabus } from "@/hooks/useSyllabus";
import { useTasks } from "@/hooks/useTasks";
import { getLimitUsage } from "@/lib/plans";

function DashboardContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { tasks, loading: tasksLoading, error: tasksError, addTask, completeTask, deleteTask } =
    useTasks(user?.uid);
  const {
    totalStudyTimeToday,
    sessionsToday,
    loading: sessionsLoading,
    error: sessionsError,
    pendingOfflineSessions
  } = useSessions(user?.uid);
  const { currentStreak, loading: streakLoading, error: streakError } = useStreak(user?.uid);
  const [actionError, setActionError] = useState<string | null>(null);

  if (authLoading || !user) {
    return <LoadingState label="Loading dashboard" />;
  }

  async function handleCompleteTask(taskId: string) {
    setActionError(null);

    try {
      await completeTask(taskId);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not complete task.");
    }
  }

  async function handleDeleteTask(taskId: string) {
    setActionError(null);

    try {
      await deleteTask(taskId);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not delete task.");
    }
  }

  return (
    <>
      <Navbar email={user.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Today's Focus"
          title="What should I do right now?"
          subtitle="Plan the day, pick one task, and save each finished session so progress stays visible."
          action={
            <Link className="btn-primary w-full sm:w-auto" href="/focus">
              Start Focus Session
            </Link>
          }
        />
        <DashboardPlanAwareness userId={user.uid} />

        {(actionError ?? sessionsError ?? streakError) ? (
          <StatusMessage tone="error">{actionError ?? sessionsError ?? streakError}</StatusMessage>
        ) : null}
        {pendingOfflineSessions > 0 ? (
          <StatusMessage tone="success">
            {pendingOfflineSessions} offline focus session{pendingOfflineSessions === 1 ? "" : "s"} queued for sync.
          </StatusMessage>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[1fr_20rem]">
          <StatsCards
            totalStudyTimeToday={totalStudyTimeToday}
            sessionsToday={sessionsToday}
            loading={sessionsLoading}
          />
          <StreakCard currentStreak={currentStreak} loading={streakLoading} />
        </section>

        <DashboardPlanningOverview userId={user.uid} />
        <DashboardStudentPlanner userId={user.uid} />
        <DashboardMarksProgress userId={user.uid} />
        <DashboardTodaySetup userId={user.uid} />
        <DashboardPerformanceSnapshot userId={user.uid} />

        <TaskForm onAddTask={addTask} />

        <TaskList
          tasks={tasks}
          loading={tasksLoading}
          error={tasksError}
          onCompleteTask={handleCompleteTask}
          onDeleteTask={handleDeleteTask}
          onStartTask={(taskId) => router.push(`/focus?taskId=${encodeURIComponent(taskId)}`)}
        />
      </main>
    </>
  );
}

function DashboardPlanAwareness({ userId }: { userId: string }) {
  const ready = useDeferredDataStart(140);
  const plan = usePlan(ready ? userId : undefined);
  const syllabus = useSyllabus(ready ? userId : undefined);
  const marks = useMarksEntries(ready ? userId : undefined, { subjects: syllabus.subjects });
  const backlog = useBacklogItems(ready ? userId : undefined);
  const battlePlan = useDailyBattlePlan(ready ? userId : undefined);
  const subjectUsage = getLimitUsage(syllabus.subjects.length, plan.limits.subjectsLimit);
  const marksUsage = getLimitUsage(marks.entries.length, plan.limits.marksEntriesLimit);
  const backlogUsage = getLimitUsage(backlog.items.length, plan.limits.backlogItemsLimit);
  const battlePlanUsage = getLimitUsage(battlePlan.plan?.items.length ?? 0, plan.limits.battlePlanItemsLimit);
  const usages = [
    ["Subjects", subjectUsage],
    ["Marks", marksUsage],
    ["Backlog", backlogUsage],
    ["Battle plan today", battlePlanUsage]
  ] as const;

  if (!ready || plan.loading) {
    return null;
  }

  return (
    <section className="card p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <PlanBadge plan={plan.plan} />
          <p className="text-sm font-semibold text-forge-muted">
            {plan.expired ? "Paid access expired; data is safe on Starter." : plan.definition.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {usages.map(([label, usage]) => (
            <span className="rounded-full border border-forge-line bg-white px-3 py-1.5 text-xs font-bold text-forge-muted" key={label}>
              {label}: {usage.label}
            </span>
          ))}
          <Link className="btn-ghost" href="/pricing">Compare plans</Link>
        </div>
      </div>
    </section>
  );
}

function DashboardStudentPlanner({ userId }: { userId: string }) {
  const ready = useDeferredDataStart(180);
  const planner = useStudentPlannerSummaries(ready ? userId : undefined);

  return (
    <>
      {planner.error ? <StatusMessage tone="error">{planner.error}</StatusMessage> : null}
      <StudentPlannerSnapshot
        subjects={planner.subjects}
        todayEvents={planner.todayEvents}
        nextClass={planner.nextClass}
        scheduleContext={planner.scheduleContext}
        pendingAssignments={planner.pendingAssignments}
        overdueAssignments={planner.overdueAssignments}
        highPriorityAssignments={planner.highPriorityAssignments}
        upcomingAssignments={planner.upcomingAssignments.slice(0, 5)}
        upcomingExams={planner.upcomingExams.slice(0, 5)}
        nearestExam={planner.nearestExam}
        dueRevisions={planner.dueRevisions}
        overdueRevisions={planner.overdueRevisions}
        weeklyStats={planner.weeklyStats}
        loading={!ready || planner.loading}
      />
    </>
  );
}

function DashboardTodaySetup({ userId }: { userId: string }) {
  const ready = useDeferredDataStart(260);
  const setup = usePhase6DashboardSummaries(ready ? userId : undefined);
  const activeSession = useActiveFocusSession();

  return (
    <>
      {setup.error ? <StatusMessage tone="error">{setup.error}</StatusMessage> : null}
      <TodaySetup
        dailyTargetMinutes={setup.dailyTargetMinutes}
        targetProgress={setup.targetProgress}
        preferredFocusDuration={setup.preferredFocusDuration}
        dailyReviewDone={setup.dailyReviewDone}
        unreadReminders={setup.unreadReminders}
        weeklyStudyMinutes={setup.weeklyStudyMinutes}
        completedSessionsThisWeek={setup.completedSessionsThisWeek}
        abandonedSessionsThisWeek={setup.abandonedSessionsThisWeek}
        bestFocusDay={setup.bestFocusDay}
        activeSession={activeSession}
        productivityScore={setup.productivityScore}
        backlogActiveCount={setup.backlogActiveCount}
        heavyBacklogCount={setup.heavyBacklogCount}
        backlogClearedThisWeek={setup.backlogClearedThisWeek}
        battlePlanItems={setup.battlePlanItems}
        battlePlanSaved={setup.battlePlanSaved}
        battlePlanAvailableMinutes={setup.battlePlanAvailableMinutes}
        weakFocusTitle={setup.weakFocusTitle}
        weakFocusDetail={setup.weakFocusDetail}
        loading={!ready || setup.loading}
      />
    </>
  );
}

function DashboardMarksProgress({ userId }: { userId: string }) {
  const ready = useDeferredDataStart(240);
  const syllabus = useSyllabus(ready ? userId : undefined);
  const marks = useMarksEntries(ready ? userId : undefined, { subjects: syllabus.subjects });

  return (
    <>
      {marks.error || syllabus.error ? <StatusMessage tone="error">{marks.error ?? syllabus.error}</StatusMessage> : null}
      <MarksProgressSnapshot
        summary={marks.summary}
        loading={!ready || marks.loading || syllabus.loading}
      />
    </>
  );
}

function DashboardPlanningOverview({ userId }: { userId: string }) {
  const ready = useDeferredDataStart(160);
  const planning = useDashboardSummaries(ready ? userId : undefined);

  return (
    <>
      {planning.error ? <StatusMessage tone="error">{planning.error}</StatusMessage> : null}
      <PlanningOverview
        nextBlock={planning.nextBlock}
        revisionsDue={planning.revisionsDue}
        revisionsOverdue={planning.revisionsOverdue}
        syllabusProgress={planning.syllabusProgress}
        habitsCompletedToday={planning.habitsCompletedToday}
        totalHabits={planning.totalHabits}
        loading={!ready || planning.loading}
      />
    </>
  );
}

function DashboardPerformanceSnapshot({ userId }: { userId: string }) {
  const ready = useDeferredDataStart(220);
  const snapshot = usePhase5DashboardSummaries(ready ? userId : undefined);

  return (
    <>
      {snapshot.error ? <StatusMessage tone="error">{snapshot.error}</StatusMessage> : null}
      <PerformanceSnapshot
        productivityScore={snapshot.productivityScore}
        topWeakArea={snapshot.topWeakArea}
        nearestGoal={snapshot.nearestGoal}
        recentMockTest={snapshot.recentMockTest}
        mockSummary={snapshot.mockSummary}
        journalPrompt={snapshot.journalPrompt}
        recentJournal={snapshot.recentJournal}
        loading={!ready || snapshot.loading}
      />
    </>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
