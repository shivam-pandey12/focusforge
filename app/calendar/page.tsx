"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/LoadingState";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import StatusMessage from "@/components/StatusMessage";
import {
  addDays,
  formatLongDate,
  formatShortDate,
  getDayName,
  getTodayDateKey,
  parseDateKey
} from "@/lib/date";
import {
  DEFAULT_PLANNER_EVENT_FILTERS,
  PLANNER_EVENT_LABELS,
  filterPlannerEvents,
  getEventTypeCounts,
  groupPlannerEventsByDate,
  type PlannerEvent,
  type PlannerEventFilters,
  type PlannerEventTypeFilter
} from "@/lib/plannerEvents";
import { useAuth } from "@/hooks/useAuth";
import { useCalendarData } from "@/hooks/useCalendarData";
import { useDeferredDataStart } from "@/hooks/useDeferredDataStart";
import type { AssignmentPriority, AssignmentStatus, BacklogStatus, RevisionStatus } from "@/types";

type CalendarView = "month" | "week";

const eventTypeOptions: PlannerEventTypeFilter[] = ["all", "class", "homework", "exam", "revision", "backlog", "reminder"];
const homeworkStatuses: Array<"all" | AssignmentStatus | RevisionStatus | BacklogStatus> = ["all", "Pending", "In Progress", "Completed", "Done", "Skipped", "Not Started", "Cleared"];
const priorities: Array<"all" | AssignmentPriority> = ["all", "High", "Medium", "Low"];

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
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

function eventTime(event: PlannerEvent): string {
  if (event.startTime && event.endTime) {
    return `${event.startTime} - ${event.endTime}`;
  }

  return event.startTime ?? "All day";
}

function CalendarEventRow({ event, compact = false }: { event: PlannerEvent; compact?: boolean }) {
  return (
    <Link
      className="block rounded-2xl border border-forge-line bg-white px-4 py-3 transition hover:border-forge-gold/60"
      href={event.href}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-forge-text">{event.title}</p>
          <p className="mt-1 text-sm font-semibold text-forge-muted">
            {[event.subjectName, eventTime(event)].filter(Boolean).join(" / ")}
          </p>
        </div>
        <span className={eventBadgeClass(event)}>{eventTypeLabel(event)}</span>
      </div>
      {!compact && event.meta ? <p className="mt-2 line-clamp-2 text-sm text-forge-muted">{event.meta}</p> : null}
    </Link>
  );
}

function FilterSelect({
  label,
  value,
  children,
  onChange
}: {
  label: string;
  value: string;
  children: React.ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid min-w-[10rem] flex-1 gap-2">
      <span className="label">{label}</span>
      <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function CalendarFilters({
  filters,
  subjects,
  onChange,
  onReset
}: {
  filters: PlannerEventFilters;
  subjects: Array<{ id: string; name: string }>;
  onChange: (filters: PlannerEventFilters) => void;
  onReset: () => void;
}) {
  const dirty = JSON.stringify(filters) !== JSON.stringify(DEFAULT_PLANNER_EVENT_FILTERS);

  return (
    <section className="card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <FilterSelect
          label="Event type"
          value={filters.type}
          onChange={(value) => onChange({ ...filters, type: value as PlannerEventTypeFilter })}
        >
          {eventTypeOptions.map((type) => (
            <option key={type} value={type}>{PLANNER_EVENT_LABELS[type]}</option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Subject"
          value={filters.subjectId}
          onChange={(value) => onChange({ ...filters, subjectId: value })}
        >
          <option value="">All subjects</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>{subject.name}</option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Status"
          value={filters.homeworkStatus}
          onChange={(value) => onChange({ ...filters, homeworkStatus: value as PlannerEventFilters["homeworkStatus"] })}
        >
          {homeworkStatuses.map((status) => (
            <option key={status} value={status}>{status === "all" ? "All statuses" : status}</option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Priority"
          value={filters.priority}
          onChange={(value) => onChange({ ...filters, priority: value as PlannerEventFilters["priority"] })}
        >
          {priorities.map((priority) => (
            <option key={priority} value={priority}>{priority === "all" ? "All priorities" : priority}</option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Exam timing"
          value={filters.examTiming}
          onChange={(value) => onChange({ ...filters, examTiming: value as PlannerEventFilters["examTiming"] })}
        >
          <option value="all">All exams</option>
          <option value="upcoming">Upcoming exams</option>
          <option value="past">Past exams</option>
        </FilterSelect>
        <button className="btn-secondary shrink-0" type="button" onClick={onReset} disabled={!dirty}>
          Reset
        </button>
      </div>
    </section>
  );
}

function MonthCalendar({
  dateKeys,
  eventsByDate,
  selectedDateKey,
  today,
  onSelectDate
}: {
  dateKeys: string[];
  eventsByDate: Record<string, PlannerEvent[]>;
  selectedDateKey: string;
  today: string;
  onSelectDate: (dateKey: string) => void;
}) {
  const cells = useMemo(() => {
    if (dateKeys.length === 0) {
      return [];
    }

    const firstDayOffset = parseDateKey(dateKeys[0]).getDay();

    return [...Array.from({ length: firstDayOffset }, () => null), ...dateKeys];
  }, [dateKeys]);

  return (
    <div className="card p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-forge-muted sm:gap-2 sm:text-sm">
        {[
          ["S", "Sun"],
          ["M", "Mon"],
          ["T", "Tue"],
          ["W", "Wed"],
          ["T", "Thu"],
          ["F", "Fri"],
          ["S", "Sat"]
        ].map(([shortDay, day], index) => (
          <div key={`${day}-${index}`}>
            <span className="sm:hidden">{shortDay}</span>
            <span className="hidden sm:inline">{day}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 sm:gap-2">
        {cells.map((dateKey, index) => {
          if (!dateKey) {
            return <div className="min-h-[4.25rem] sm:min-h-28" key={`blank-${index}`} />;
          }

          const date = parseDateKey(dateKey);
          const events = eventsByDate[dateKey] ?? [];
          const counts = getEventTypeCounts(events);
          const active = dateKey === selectedDateKey;

          return (
            <button
              className={
                active
                  ? "min-h-[4.25rem] overflow-hidden rounded-xl border border-forge-gold bg-[#FFF8EA] p-1 text-left shadow-glow transition sm:min-h-28 sm:rounded-2xl sm:p-3"
                  : "min-h-[4.25rem] overflow-hidden rounded-xl border border-forge-line bg-white p-1 text-left transition hover:border-forge-gold/60 sm:min-h-28 sm:rounded-2xl sm:p-3"
              }
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(dateKey)}
            >
              <span className={dateKey === today ? "text-sm font-bold text-forge-gold sm:text-base" : "text-sm font-bold text-forge-text sm:text-base"}>
                {date.getDate()}
              </span>
              {events.length > 0 ? (
                <>
                <span className="mt-1 flex flex-wrap gap-1 sm:hidden" aria-label={`${events.length} planner item${events.length === 1 ? "" : "s"}`}>
                  {counts.class > 0 ? <span className="h-1.5 w-1.5 rounded-full bg-forge-gold" title={`${counts.class} class`} /> : null}
                  {counts.homework > 0 ? <span className="h-1.5 w-1.5 rounded-full bg-[#F7E2B6]" title={`${counts.homework} homework due`} /> : null}
                  {counts.exam > 0 ? <span className="h-1.5 w-1.5 rounded-full bg-[#F9D8CC]" title={`${counts.exam} exam`} /> : null}
                  {counts.revision > 0 ? <span className="h-1.5 w-1.5 rounded-full bg-[#E8F3D6]" title={`${counts.revision} revision`} /> : null}
                  {counts.backlog > 0 ? <span className="h-1.5 w-1.5 rounded-full bg-[#EFE3C7]" title={`${counts.backlog} backlog`} /> : null}
                  {events.length > 4 ? <span className="text-[9px] font-bold leading-none text-forge-muted">+{events.length - 4}</span> : null}
                </span>
                <span className="mt-1 hidden gap-1 sm:mt-2 sm:grid">
                  {counts.class > 0 ? <span className="truncate rounded-full bg-forge-gold/15 px-2 py-0.5 text-[10px] font-bold text-[#8A6838]">{counts.class} class</span> : null}
                  {counts.homework > 0 ? <span className="truncate rounded-full bg-[#F7E2B6] px-2 py-0.5 text-[10px] font-bold text-[#7A5420]">{counts.homework} due</span> : null}
                  {counts.exam > 0 ? <span className="truncate rounded-full bg-[#F9D8CC] px-2 py-0.5 text-[10px] font-bold text-[#8A3F25]">{counts.exam} exam</span> : null}
                  {counts.revision > 0 ? <span className="truncate rounded-full bg-[#E8F3D6] px-2 py-0.5 text-[10px] font-bold text-[#56712D]">{counts.revision} revision</span> : null}
                  {counts.backlog > 0 ? <span className="truncate rounded-full bg-[#EFE3C7] px-2 py-0.5 text-[10px] font-bold text-[#745A2B]">{counts.backlog} backlog</span> : null}
                  {events.length > 4 ? <span className="text-[10px] font-bold text-forge-muted">+{events.length - 4} more</span> : null}
                </span>
                </>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekCalendar({
  dateKeys,
  eventsByDate,
  selectedDateKey,
  today,
  onSelectDate
}: {
  dateKeys: string[];
  eventsByDate: Record<string, PlannerEvent[]>;
  selectedDateKey: string;
  today: string;
  onSelectDate: (dateKey: string) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-7">
      {dateKeys.map((dateKey) => {
        const events = eventsByDate[dateKey] ?? [];
        const selected = dateKey === selectedDateKey;

        return (
          <section
            className={
              selected
                ? "rounded-3xl border border-forge-gold bg-[#FFF8EA] p-4 shadow-glow"
                : "rounded-3xl border border-forge-line bg-white p-4 shadow-soft"
            }
            key={dateKey}
          >
            <button className="w-full text-left" type="button" onClick={() => onSelectDate(dateKey)}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-forge-muted">{getDayName(parseDateKey(dateKey).getDay(), "short")}</p>
              <h3 className={dateKey === today ? "mt-2 text-xl font-bold text-forge-gold" : "mt-2 text-xl font-bold text-forge-text"}>
                {formatShortDate(dateKey)}
              </h3>
              <p className="mt-1 text-sm font-semibold text-forge-muted">{events.length} item{events.length === 1 ? "" : "s"}</p>
            </button>
            <div className="mt-4 grid gap-2">
              {events.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-forge-line bg-forge-surfaceAlt/60 p-3 text-sm font-semibold text-forge-muted">Open</p>
              ) : (
                events.slice(0, 4).map((event) => <CalendarEventRow compact event={event} key={event.id} />)
              )}
              {events.length > 4 ? <p className="text-sm font-bold text-forge-muted">+{events.length - 4} more in day details</p> : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function DayDetails({
  dateKey,
  events,
  activity
}: {
  dateKey: string;
  events: PlannerEvent[];
  activity: ReturnType<typeof useCalendarData>["activitiesByDate"][string] | undefined;
}) {
  return (
    <aside className="card p-6">
      <p className="eyebrow">Selected day</p>
      <h2 className="mt-2 text-2xl font-bold text-forge-text">{formatLongDate(dateKey)}</h2>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link className="btn-ghost" href="/timetable#timetable-form">Add class</Link>
        <Link className="btn-ghost" href="/homework#homework-form">Add homework</Link>
        <Link className="btn-ghost" href="/exams#exam-form">Add exam</Link>
        <Link className="btn-ghost" href="/revision">Add revision</Link>
      </div>

      <div className="mt-6">
        <h3 className="text-base font-bold text-forge-text">Planner items</h3>
        {events.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-forge-line bg-forge-surfaceAlt/60 p-5">
            <p className="font-bold text-forge-text">No planner items for this day</p>
            <p className="mt-1 text-sm text-forge-muted">Try clearing filters or add a timetable block, homework, exam, or revision.</p>
          </div>
        ) : (
          <div className="mt-3 grid gap-3">
            {events.map((event) => <CalendarEventRow event={event} key={event.id} />)}
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-forge-line pt-5">
        <p className="eyebrow">Study activity</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-forge-line bg-white p-4">
            <p className="text-sm font-bold text-forge-muted">Study time</p>
            <p className="mt-2 text-2xl font-bold text-forge-text">{formatMinutes(activity?.studyMinutes ?? 0)}</p>
          </div>
          <div className="rounded-2xl border border-forge-line bg-white p-4">
            <p className="text-sm font-bold text-forge-muted">Sessions</p>
            <p className="mt-2 text-2xl font-bold text-forge-text">{activity?.sessions.length ?? 0}</p>
          </div>
        </div>
        {(activity?.completedTasks.length ?? 0) > 0 ? (
          <div className="mt-4 grid gap-2">
            {activity?.completedTasks.slice(0, 3).map((task) => (
              <div className="rounded-2xl border border-forge-line bg-white p-3" key={task.id}>
                <p className="font-semibold text-forge-text">{task.title}</p>
                <p className="mt-1 text-sm text-forge-muted">{task.subject || "No subject"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm font-semibold text-forge-muted">No completed focus tasks saved for this day.</p>
        )}
      </div>
    </aside>
  );
}

function CalendarContent() {
  const { user, loading: authLoading } = useAuth();
  const [view, setView] = useState<CalendarView>("month");
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [visibleWeek, setVisibleWeek] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(getTodayDateKey());
  const [filters, setFilters] = useState<PlannerEventFilters>(DEFAULT_PLANNER_EVENT_FILTERS);
  const dataReady = useDeferredDataStart();
  const {
    activitiesByDate,
    monthDateKeys,
    weekDateKeys,
    monthPlannerEvents,
    weekPlannerEvents,
    subjects,
    loading,
    error
  } = useCalendarData(dataReady ? user?.uid : undefined, visibleMonth, visibleWeek);
  const today = getTodayDateKey();

  const visibleDateKeys = view === "month" ? monthDateKeys : weekDateKeys;

  useEffect(() => {
    if (visibleDateKeys.length > 0 && !visibleDateKeys.includes(selectedDateKey)) {
      setSelectedDateKey(visibleDateKeys.includes(today) ? today : visibleDateKeys[0]);
    }
  }, [selectedDateKey, today, visibleDateKeys]);

  const visibleEvents = view === "month" ? monthPlannerEvents : weekPlannerEvents;
  const filteredEvents = useMemo(() => filterPlannerEvents(visibleEvents, filters), [filters, visibleEvents]);
  const filteredEventsByDate = useMemo(() => groupPlannerEventsByDate(filteredEvents), [filteredEvents]);
  const selectedEvents = filteredEventsByDate[selectedDateKey] ?? [];
  const selectedActivity = activitiesByDate[selectedDateKey];
  const monthLabel = visibleMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });
  const weekLabel = weekDateKeys.length > 0
    ? `${formatShortDate(weekDateKeys[0])} - ${formatShortDate(weekDateKeys[weekDateKeys.length - 1])}`
    : "Week";

  if (authLoading || !user) {
    return <LoadingState label="Loading calendar" />;
  }

  function goPrevious() {
    if (view === "month") {
      setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1));
      return;
    }

    setVisibleWeek((week) => addDays(week, -7));
  }

  function goNext() {
    if (view === "month") {
      setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1));
      return;
    }

    setVisibleWeek((week) => addDays(week, 7));
  }

  function jumpToToday() {
    const now = new Date();

    setVisibleMonth(now);
    setVisibleWeek(now);
    setSelectedDateKey(today);
  }

  return (
    <>
      <Navbar email={user.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Planner calendar"
          title="Classes, homework, exams, revision, and reminders in one view."
          subtitle="Use the monthly view for scanning and the weekly view for deciding what needs attention next."
          action={
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" type="button" onClick={goPrevious}>Previous</button>
              <button className="btn-secondary" type="button" onClick={jumpToToday}>Today</button>
              <button className="btn-secondary" type="button" onClick={goNext}>Next</button>
              <Link className="btn-secondary" href="/docs#notes-calendar-analytics">Calendar help</Link>
            </div>
          }
        />

        {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}

        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-full rounded-3xl border border-forge-line bg-white p-1 shadow-soft sm:w-auto">
            <button
              className={view === "month" ? "btn-primary flex-1 sm:flex-none" : "btn-ghost flex-1 sm:flex-none"}
              type="button"
              onClick={() => setView("month")}
            >
              Monthly
            </button>
            <button
              className={view === "week" ? "btn-primary flex-1 sm:flex-none" : "btn-ghost flex-1 sm:flex-none"}
              type="button"
              onClick={() => setView("week")}
            >
              Weekly
            </button>
          </div>
          <div className="rounded-3xl border border-forge-line bg-white px-5 py-3 shadow-soft">
            <p className="text-sm font-bold text-forge-muted">{view === "month" ? monthLabel : weekLabel}</p>
          </div>
        </section>

        <CalendarFilters
          filters={filters}
          subjects={subjects}
          onChange={setFilters}
          onReset={() => setFilters(DEFAULT_PLANNER_EVENT_FILTERS)}
        />

        {!dataReady || loading ? (
          <section className="card p-6 sm:p-8">
            <LoadingState label="Loading planner calendar" mode="inline" />
          </section>
        ) : (
          <section className="grid gap-6 xl:grid-cols-[1fr_24rem]">
            <div className="space-y-4">
              {view === "month" ? (
                <MonthCalendar
                  dateKeys={monthDateKeys}
                  eventsByDate={filteredEventsByDate}
                  selectedDateKey={selectedDateKey}
                  today={today}
                  onSelectDate={setSelectedDateKey}
                />
              ) : (
                <WeekCalendar
                  dateKeys={weekDateKeys}
                  eventsByDate={filteredEventsByDate}
                  selectedDateKey={selectedDateKey}
                  today={today}
                  onSelectDate={setSelectedDateKey}
                />
              )}
              {visibleEvents.length === 0 ? (
                <EmptyState
                  title="No planner items yet"
                  description="Add a timetable entry, homework, exam, or revision item to start filling the calendar."
                  action={<Link className="btn-primary" href="/timetable#timetable-form">Add timetable entry</Link>}
                />
              ) : filteredEvents.length === 0 ? (
                <EmptyState
                  title="No planner items match"
                  description="Clear filters to bring classes, homework, exams, revision, and reminders back into view."
                  action={<button className="btn-secondary" type="button" onClick={() => setFilters(DEFAULT_PLANNER_EVENT_FILTERS)}>Reset filters</button>}
                />
              ) : null}
            </div>
            <DayDetails dateKey={selectedDateKey} events={selectedEvents} activity={selectedActivity} />
          </section>
        )}
      </main>
    </>
  );
}

export default function CalendarPage() {
  return (
    <AuthGuard>
      <CalendarContent />
    </AuthGuard>
  );
}
