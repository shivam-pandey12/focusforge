import Link from "next/link";
import LoadingState from "@/components/LoadingState";
import SectionHeader from "@/components/SectionHeader";
import { getCountdownLabel, type PlannerEvent } from "@/lib/plannerEvents";
import { getScheduleContextSummary, type TimetableScheduleContext } from "@/lib/timetable";
import type { ExamSchedule, RevisionPlan, StudyAssignment, SyllabusSubject, TimetableBlock } from "@/types";

interface StudentPlannerSnapshotProps {
  subjects: SyllabusSubject[];
  todayEvents: PlannerEvent[];
  nextClass: TimetableBlock | null;
  scheduleContext: TimetableScheduleContext;
  pendingAssignments: StudyAssignment[];
  overdueAssignments: StudyAssignment[];
  highPriorityAssignments: StudyAssignment[];
  upcomingAssignments: StudyAssignment[];
  upcomingExams: ExamSchedule[];
  nearestExam: ExamSchedule | null;
  dueRevisions: RevisionPlan[];
  overdueRevisions: RevisionPlan[];
  weeklyStats: {
    classes: number;
    homework: number;
    exams: number;
    revision: number;
    backlog: number;
    completedAssignments: number;
  };
  loading: boolean;
}

function eventTypeLabel(event: PlannerEvent): string {
  if (event.type === "class") {
    return "Class";
  }

  if (event.type === "homework") {
    return "Homework";
  }

  if (event.type === "exam") {
    return "Exam";
  }

  if (event.type === "revision") {
    return "Revision";
  }

  if (event.type === "backlog") {
    return "Backlog";
  }

  return "Reminder";
}

function eventTime(event: PlannerEvent): string {
  if (event.startTime && event.endTime) {
    return `${event.startTime} - ${event.endTime}`;
  }

  return event.startTime ?? "All day";
}

function eventBadgeClass(event: PlannerEvent): string {
  if (event.type === "exam") {
    return "badge badge-warning";
  }

  if (event.type === "homework") {
    return event.priority === "High" ? "badge badge-warning" : "badge";
  }

  if (event.type === "class") {
    return "badge badge-open";
  }

  if (event.type === "revision") {
    return event.priority === "High" ? "badge badge-warning" : "badge badge-open";
  }

  if (event.type === "backlog") {
    return event.priority === "High" ? "badge badge-warning" : "badge badge-open";
  }

  return "badge";
}

function PlannerEventRow({ event }: { event: PlannerEvent }) {
  return (
    <Link className="block rounded-2xl border border-forge-line bg-white px-4 py-3 transition hover:border-forge-gold/60" href={event.href}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-forge-text">{event.title}</p>
          <p className="mt-1 text-sm font-semibold text-forge-muted">
            {[event.subjectName, eventTime(event)].filter(Boolean).join(" / ")}
          </p>
        </div>
        <span className={eventBadgeClass(event)}>{eventTypeLabel(event)}</span>
      </div>
      {event.meta ? <p className="mt-2 line-clamp-2 text-sm text-forge-muted">{event.meta}</p> : null}
    </Link>
  );
}

function MiniStat({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-2xl border border-forge-line bg-white p-4">
      <p className="text-sm font-bold text-forge-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-forge-text">{value}</p>
      <p className="mt-1 text-sm text-forge-muted">{detail}</p>
    </div>
  );
}

export default function StudentPlannerSnapshot({
  subjects,
  todayEvents,
  nextClass,
  scheduleContext,
  pendingAssignments,
  overdueAssignments,
  highPriorityAssignments,
  upcomingAssignments,
  upcomingExams,
  nearestExam,
  dueRevisions,
  overdueRevisions,
  weeklyStats,
  loading
}: StudentPlannerSnapshotProps) {
  if (loading) {
    return (
      <section className="card p-6 sm:p-8">
        <LoadingState label="Loading student planner" mode="inline" />
      </section>
    );
  }

  return (
    <section className="card p-6 sm:p-8">
      <SectionHeader
        eyebrow="Student planner"
        title="Today, deadlines, exams, and the week ahead."
        action={
          <div className="flex flex-wrap gap-2">
            <Link className="btn-ghost" href="/subjects">Add Subject</Link>
            <Link className="btn-ghost" href="/timetable#timetable-form">Add Timetable</Link>
            <Link className="btn-ghost" href="/homework#homework-form">Add Homework</Link>
            <Link className="btn-ghost" href="/exams#exam-form">Add Exam</Link>
            <Link className="btn-ghost" href="/marks">Add Marks</Link>
            <Link className="btn-ghost" href="/revision">Add Revision</Link>
            <Link className="btn-ghost" href="/backlog">Add Backlog</Link>
            <Link className="btn-ghost" href="/battle-plan">Battle Plan</Link>
            <Link className="btn-secondary" href="/calendar">Open Calendar</Link>
          </div>
        }
      />

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-forge-line bg-forge-surfaceAlt/60 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow text-forge-muted">Today timeline</p>
              <h3 className="mt-2 text-xl font-bold text-forge-text">{todayEvents.length} planner item{todayEvents.length === 1 ? "" : "s"}</h3>
            </div>
            <Link className="btn-ghost" href="/calendar">View day</Link>
          </div>
          <div className="mt-4 grid gap-3">
            {todayEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-forge-line bg-white/70 p-5">
                <p className="font-bold text-forge-text">No planner items today</p>
                <p className="mt-1 text-sm text-forge-muted">Classes, homework, exams, revision, backlog targets, and reminders will appear here.</p>
              </div>
            ) : (
              todayEvents.slice(0, 5).map((event) => <PlannerEventRow event={event} key={event.id} />)
            )}
          </div>
        </div>

        <div className="grid gap-4">
          <Link className="interactive-card" href="/timetable">
            <span className="eyebrow text-forge-muted">Next class / study block</span>
            <span className="mt-3 block text-2xl font-bold text-forge-text">
              {nextClass ? nextClass.subject : "No block scheduled"}
            </span>
            <span className="mt-2 inline-flex rounded-full border border-forge-gold/35 bg-forge-surfaceAlt/80 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-forge-gold">
              {getScheduleContextSummary(scheduleContext)}
            </span>
            <span className="mt-2 block text-base text-forge-muted">
              {nextClass
                ? `${nextClass.startTime} - ${nextClass.endTime} / ${nextClass.classType ?? "Study block"}`
                : "Add a timetable entry to see what comes next."}
            </span>
            {nextClass?.teacherName || nextClass?.location ? (
              <span className="mt-2 block text-sm font-semibold text-forge-muted">
                {[nextClass.teacherName, nextClass.location].filter(Boolean).join(" / ")}
              </span>
            ) : null}
          </Link>

          <Link className="interactive-card" href="/exams">
            <span className="eyebrow text-forge-muted">Exam countdown</span>
            <span className="mt-3 block text-2xl font-bold text-forge-text">
              {nearestExam ? getCountdownLabel(nearestExam.date) : "No exams scheduled"}
            </span>
            <span className="mt-2 block text-base text-forge-muted">
              {nearestExam
                ? `${nearestExam.name} / ${nearestExam.fullSyllabus ? "Full syllabus" : nearestExam.subject ?? "No subject"}`
                : "Schedule a test when dates are announced."}
            </span>
            {nearestExam?.startTime ? <span className="mt-2 block text-sm font-semibold text-forge-muted">{nearestExam.date} at {nearestExam.startTime}</span> : null}
          </Link>

          <Link className="interactive-card" href="/revision">
            <span className="eyebrow text-forge-muted">Today&apos;s revision</span>
            <span className="mt-3 block text-2xl font-bold text-forge-text">
              {dueRevisions.length > 0 ? `${dueRevisions.length} due today` : "No revision due today"}
            </span>
            <span className="mt-2 block text-base text-forge-muted">
              {overdueRevisions.length > 0
                ? `${overdueRevisions.length} overdue revision item${overdueRevisions.length === 1 ? "" : "s"} need attention.`
                : "Manual revision plans will appear on the calendar and dashboard."}
            </span>
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-forge-line bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow text-forge-muted">Homework pressure</p>
              <h3 className="mt-2 text-xl font-bold text-forge-text">{pendingAssignments.length} pending</h3>
            </div>
            <Link className="btn-ghost" href="/homework">Open</Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MiniStat label="Overdue" value={overdueAssignments.length} detail="Need attention" />
            <MiniStat label="High" value={highPriorityAssignments.length} detail="Priority" />
            <MiniStat label="Revision" value={dueRevisions.length + overdueRevisions.length} detail="Due/overdue" />
            <MiniStat label="Subjects" value={subjects.length} detail="Active" />
          </div>
          <div className="mt-4 grid gap-2">
            {upcomingAssignments.slice(0, 3).map((assignment) => (
              <Link className="rounded-2xl border border-forge-line bg-forge-surfaceAlt/60 p-3 transition hover:border-forge-gold/60" href="/homework" key={assignment.id}>
                <p className="font-bold text-forge-text">{assignment.title}</p>
                <p className="mt-1 text-sm font-semibold text-forge-muted">
                  {assignment.subject} / {assignment.dueDate} / {assignment.priority}
                </p>
              </Link>
            ))}
            {upcomingAssignments.length === 0 ? <p className="text-base text-forge-muted">No pending homework due next.</p> : null}
          </div>
        </div>

        <div className="rounded-3xl border border-forge-line bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow text-forge-muted">Weekly overview</p>
              <h3 className="mt-2 text-xl font-bold text-forge-text">This week at a glance</h3>
            </div>
            <Link className="btn-ghost" href="/calendar">Calendar</Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniStat label="Classes" value={weeklyStats.classes} detail="Blocks this week" />
            <MiniStat label="Homework" value={weeklyStats.homework} detail="Due this week" />
            <MiniStat label="Exams" value={weeklyStats.exams} detail="Scheduled this week" />
            <MiniStat label="Revision" value={weeklyStats.revision} detail="Due this week" />
            <MiniStat label="Backlog" value={weeklyStats.backlog} detail="Targets this week" />
            <MiniStat label="Completed" value={weeklyStats.completedAssignments} detail="Homework finished" />
          </div>
          <p className="mt-4 text-sm font-semibold text-forge-muted">
            {upcomingExams.length > 0
              ? `${upcomingExams.length} upcoming exam${upcomingExams.length === 1 ? "" : "s"} on your plan.`
              : "No upcoming exams are scheduled yet."}
          </p>
        </div>
      </div>
    </section>
  );
}
