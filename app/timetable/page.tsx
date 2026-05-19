"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import EmptyState from "@/components/EmptyState";
import FeatureLockedCard from "@/components/FeatureLockedCard";
import LimitReachedNotice from "@/components/LimitReachedNotice";
import LoadingState from "@/components/LoadingState";
import MetricCard from "@/components/MetricCard";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import StatusMessage from "@/components/StatusMessage";
import UpgradePrompt from "@/components/UpgradePrompt";
import { useAuth } from "@/hooks/useAuth";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useDeferredDataStart } from "@/hooks/useDeferredDataStart";
import { usePlan } from "@/hooks/usePlan";
import { useSyllabus } from "@/hooks/useSyllabus";
import { useTimetable } from "@/hooks/useTimetable";
import {
  formatDuration,
  formatShortDate,
  getDayName,
  getTodayDateKey,
  getWeekDateKeys,
  parseDateKey
} from "@/lib/date";
import { getLimitUsage } from "@/lib/plans";
import {
  DEFAULT_SCHEDULE_PROFILE_ID,
  DEFAULT_SCHEDULE_PROFILE_NAME,
  SCHEDULE_PROFILE_TYPES,
  TIMETABLE_WEEK_GROUPS,
  getScheduleContextSummary,
  getScheduleModeLabel,
  getTimetableScheduleLabel,
  getVirtualDefaultScheduleProfile
} from "@/lib/timetable";
import type { ScheduleProfile, ScheduleProfileType, TimetableBlock, TimetableClassType, TimetableScheduleMode, TimetableWeekGroup } from "@/types";
import type { ScheduleProfileInput, TimetableBlockInput } from "@/lib/firebase/firestore";

const classTypes: TimetableClassType[] = ["School", "Coaching", "Self-study", "Online", "Other"];
const profileColors = ["#C9A46C", "#7C6F57", "#6E8B7E", "#8A6F9E", "#B66A5D", "#4F7CAC"];

const defaultForm = {
  subjectId: "",
  subject: "",
  classType: "School" as TimetableClassType,
  dayOfWeek: new Date().getDay(),
  startTime: "09:00",
  endTime: "10:00",
  teacherName: "",
  location: "",
  notes: "",
  scheduleProfileId: DEFAULT_SCHEDULE_PROFILE_ID,
  scheduleProfileName: DEFAULT_SCHEDULE_PROFILE_NAME,
  scheduleMode: "weekly" as TimetableScheduleMode,
  weekGroup: "Both" as TimetableWeekGroup,
  cycleDayNumber: "1",
  cycleLength: "5",
  effectiveFrom: "",
  effectiveUntil: "",
  conflictIgnored: false
};

const defaultProfileForm = {
  name: "",
  type: "School" as ScheduleProfileType,
  color: "#C9A46C",
  description: "",
  scheduleMode: "weekly" as TimetableScheduleMode,
  activeWeek: "A" as Exclude<TimetableWeekGroup, "Both">,
  cycleLength: "5",
  activeCycleDay: "1"
};

function getBlockPeriod(block: TimetableBlock): "Morning" | "Afternoon" | "Evening" {
  const hour = Number(block.startTime.split(":")[0] ?? 0);

  if (hour < 12) {
    return "Morning";
  }

  if (hour < 17) {
    return "Afternoon";
  }

  return "Evening";
}

function profileToForm(profile: ScheduleProfile) {
  return {
    name: profile.name,
    type: profile.type,
    color: profile.color ?? "#C9A46C",
    description: profile.description ?? "",
    scheduleMode: profile.scheduleMode,
    activeWeek: profile.activeWeek,
    cycleLength: String(profile.cycleLength),
    activeCycleDay: String(profile.activeCycleDay)
  };
}

function TimetableContent() {
  const { user, loading: authLoading } = useAuth();
  const dataReady = useDeferredDataStart();
  const plan = usePlan(dataReady ? user?.uid : undefined);
  const hasAccess = plan.hasFeature("timetable");
  const hasAdvancedAccess = plan.hasFeature("advancedTimetable");
  const syllabus = useSyllabus(dataReady ? user?.uid : undefined);
  const timetable = useTimetable(dataReady && hasAccess ? user?.uid : undefined);
  const { confirm, confirmDialog } = useConfirmDialog();
  const [form, setForm] = useState(defaultForm);
  const [profileForm, setProfileForm] = useState(defaultProfileForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [view, setView] = useState<"active" | "week" | "all">("active");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [profileFilter, setProfileFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<ReturnType<typeof timetable.getConflictsForInput>>([]);
  const weekDates = useMemo(() => getWeekDateKeys(), []);
  const allProfiles = useMemo(() => [getVirtualDefaultScheduleProfile(user?.uid ?? ""), ...timetable.profiles], [timetable.profiles, user?.uid]);
  const groupedActiveDay = useMemo(() => {
    return ["Morning", "Afternoon", "Evening"].map((period) => ({
      period,
      blocks: timetable.activeDayBlocks.filter((block) => getBlockPeriod(block) === period)
    }));
  }, [timetable.activeDayBlocks]);
  const selectedSubject = syllabus.subjects.find((subject) => subject.id === form.subjectId);
  const selectedProfile = allProfiles.find((profile) => profile.id === form.scheduleProfileId) ?? allProfiles[0];
  const profileUsage = getLimitUsage(timetable.profiles.length, plan.limits.timetableProfilesLimit);
  const profileLimitReached = profileUsage.isAtLimit;
  const totalMinutes = timetable.blocks.reduce((total, block) => total + block.duration, 0);
  const visibleListBlocks = useMemo(() => {
    return timetable.blocks.filter((block) => {
      const matchesSubject = subjectFilter ? block.subjectId === subjectFilter : true;
      const matchesProfile = profileFilter ? block.scheduleProfileId === profileFilter : true;
      const matchesType = typeFilter ? block.classType === typeFilter : true;

      return matchesSubject && matchesProfile && matchesType;
    });
  }, [profileFilter, subjectFilter, timetable.blocks, typeFilter]);

  if (authLoading || !user) {
    return <LoadingState label="Loading timetable" />;
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
            feature="timetable"
            description="Basic weekly timetable access stays available through the plan system."
          />
        </main>
      </>
    );
  }

  function resetForm() {
    setForm({
      ...defaultForm,
      scheduleProfileId: timetable.scheduleContext.activeProfileId,
      scheduleProfileName: timetable.scheduleContext.activeProfileName,
      scheduleMode: timetable.scheduleContext.scheduleMode,
      cycleLength: String(timetable.scheduleContext.cycleLength),
      cycleDayNumber: String(timetable.scheduleContext.activeCycleDay)
    });
    setEditingId(null);
    setConflictWarning([]);
  }

  function resetProfileForm() {
    setProfileForm(defaultProfileForm);
    setEditingProfileId(null);
  }

  function editBlock(block: TimetableBlock) {
    setEditingId(block.id);
    setForm({
      subjectId: block.subjectId ?? "",
      subject: block.subject,
      classType: block.classType ?? "Self-study",
      dayOfWeek: block.dayOfWeek,
      startTime: block.startTime,
      endTime: block.endTime,
      teacherName: block.teacherName ?? "",
      location: block.location ?? "",
      notes: block.notes ?? "",
      scheduleProfileId: block.scheduleProfileId ?? DEFAULT_SCHEDULE_PROFILE_ID,
      scheduleProfileName: block.scheduleProfileName ?? DEFAULT_SCHEDULE_PROFILE_NAME,
      scheduleMode: block.scheduleMode ?? "weekly",
      weekGroup: block.weekGroup ?? "Both",
      cycleDayNumber: block.cycleDayNumber ? String(block.cycleDayNumber) : "1",
      cycleLength: block.cycleLength ? String(block.cycleLength) : "5",
      effectiveFrom: block.effectiveFrom ?? "",
      effectiveUntil: block.effectiveUntil ?? "",
      conflictIgnored: Boolean(block.conflictIgnored)
    });
    setActionError(null);
    setSuccess(null);
    setConflictWarning([]);
  }

  function duplicateBlock(block: TimetableBlock) {
    editBlock(block);
    setEditingId(null);
    setSuccess("Entry duplicated in the form. Adjust it and save.");
  }

  function editProfile(profile: ScheduleProfile) {
    if (profile.id === DEFAULT_SCHEDULE_PROFILE_ID) {
      return;
    }

    setEditingProfileId(profile.id);
    setProfileForm(profileToForm(profile));
    setActionError(null);
    setSuccess(null);
  }

  function buildBlockInput(ignoreConflicts = false): TimetableBlockInput {
    const subjectName = selectedSubject?.name ?? form.subject.trim();
    const profile = hasAdvancedAccess ? selectedProfile : getVirtualDefaultScheduleProfile(user?.uid ?? "");
    const scheduleMode = hasAdvancedAccess ? profile.scheduleMode : "weekly";

    return {
      title: `${subjectName} ${form.classType}`,
      subjectId: selectedSubject?.id ?? form.subjectId,
      subject: subjectName,
      classType: form.classType,
      dayOfWeek: form.dayOfWeek,
      date: "",
      startTime: form.startTime,
      endTime: form.endTime,
      teacherName: form.teacherName,
      location: form.location,
      notes: form.notes,
      isRecurring: true,
      scheduleMode,
      scheduleProfileId: hasAdvancedAccess ? profile.id : DEFAULT_SCHEDULE_PROFILE_ID,
      scheduleProfileName: hasAdvancedAccess ? profile.name : DEFAULT_SCHEDULE_PROFILE_NAME,
      weekGroup: scheduleMode === "alternateWeek" ? form.weekGroup : "Both",
      cycleDayNumber: scheduleMode === "dayCycle" ? form.cycleDayNumber : null,
      cycleLength: scheduleMode === "dayCycle" ? profile.cycleLength : null,
      effectiveFrom: hasAdvancedAccess ? form.effectiveFrom : "",
      effectiveUntil: hasAdvancedAccess ? form.effectiveUntil : "",
      isActive: true,
      conflictIgnored: ignoreConflicts
    };
  }

  async function saveTimetableEntry(ignoreConflicts = false) {
    setSaving(true);
    setActionError(null);
    setSuccess(null);

    try {
      const input = buildBlockInput(ignoreConflicts);

      if (!input.subject) {
        throw new Error("Choose a subject first.");
      }

      const conflicts = timetable.getConflictsForInput(input, editingId ?? undefined);

      if (!ignoreConflicts && conflicts.length > 0) {
        setConflictWarning(conflicts);
        return;
      }

      if (editingId) {
        await timetable.saveBlock(editingId, input);
        setSuccess(ignoreConflicts ? "Timetable entry saved with conflict ignored." : "Timetable entry updated.");
      } else {
        await timetable.createBlock(input);
        setSuccess(ignoreConflicts ? "Timetable entry added with conflict ignored." : "Timetable entry added.");
      }

      resetForm();
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : "Could not save timetable entry.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveTimetableEntry(false);
  }

  async function handleDelete(block: TimetableBlock) {
    const confirmed = await confirm({
      eyebrow: "Delete timetable entry",
      title: `Delete ${block.subject} ${block.startTime}-${block.endTime}?`,
      description: "This removes the class or study block from timetable, calendar, and dashboard schedule summaries.",
      confirmLabel: "Delete entry",
      tone: "danger"
    });

    if (!confirmed) {
      return;
    }

    setActionError(null);
    setSuccess(null);

    try {
      await timetable.removeBlock(block.id);
      if (editingId === block.id) {
        resetForm();
      }
      setSuccess("Timetable entry deleted.");
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : "Could not delete timetable entry.");
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSaving(true);
    setActionError(null);
    setSuccess(null);

    try {
      if (!hasAdvancedAccess) {
        throw new Error("Advanced timetable profiles require Forge Pro.");
      }

      if (!editingProfileId && profileLimitReached) {
        throw new Error("Your current plan has reached its schedule profile limit.");
      }

      const input: ScheduleProfileInput = profileForm;

      if (editingProfileId) {
        await timetable.saveProfile(editingProfileId, input);
        setSuccess("Schedule profile updated.");
      } else {
        await timetable.createProfile(input);
        setSuccess("Schedule profile created. Activate it when you want to use it.");
      }

      resetProfileForm();
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : "Could not save schedule profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function updateActiveProfile(partial: Partial<ScheduleProfileInput>) {
    const active = timetable.activeProfile;

    if (active.id === DEFAULT_SCHEDULE_PROFILE_ID) {
      setActionError("Create a schedule profile before changing active week or cycle day.");
      return;
    }

    setActionError(null);
    setSuccess(null);

    try {
      await timetable.saveProfile(active.id, {
        ...profileToForm(active),
        ...partial
      });
      setSuccess("Active schedule updated.");
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : "Could not update active schedule.");
    }
  }

  async function activateProfile(profileId: string) {
    setActionError(null);
    setSuccess(null);

    try {
      await timetable.activateProfile(profileId);
      setSuccess(profileId === DEFAULT_SCHEDULE_PROFILE_ID ? "Default schedule activated." : "Schedule profile activated.");
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : "Could not activate schedule profile.");
    }
  }

  async function deleteProfile(profile: ScheduleProfile) {
    if (profile.id === DEFAULT_SCHEDULE_PROFILE_ID) {
      return;
    }

    const confirmed = await confirm({
      eyebrow: "Delete schedule profile",
      title: `Delete "${profile.name}"?`,
      description: "Existing entries keep their profile snapshot, but inactive profile filters may no longer show it. Active schedule context will safely fall back if needed.",
      confirmLabel: "Delete profile",
      tone: "danger"
    });

    if (!confirmed) {
      return;
    }

    setActionError(null);
    setSuccess(null);

    try {
      await timetable.removeProfile(profile.id);
      if (editingProfileId === profile.id) {
        resetProfileForm();
      }
      setSuccess("Schedule profile deleted. Active schedule context was kept safe.");
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : "Could not delete schedule profile.");
    }
  }

  return (
    <>
      <Navbar email={user.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Timetable"
          title="Shape your weekly rhythm."
          subtitle="Keep the simple weekly timetable, or unlock rotating profiles, Week A/B schedules, day cycles, and conflict warnings."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-2xl border border-forge-line bg-white p-1.5 shadow-soft">
                {(["active", "week", "all"] as const).map((item) => (
                  <button
                    className={
                      view === item
                        ? "rounded-xl bg-forge-surfaceAlt px-4 py-3 text-sm font-bold text-forge-text sm:px-5 sm:text-base"
                        : "px-4 py-3 text-sm font-bold text-forge-muted sm:px-5 sm:text-base"
                    }
                    key={item}
                    type="button"
                    onClick={() => setView(item)}
                  >
                    {item === "active" ? "Today" : item === "week" ? "Week" : "List"}
                  </button>
                ))}
              </div>
              <Link className="btn-secondary" href="/docs#advanced-timetable">Timetable guide</Link>
            </div>
          }
        />

        {timetable.error || syllabus.error ? <StatusMessage tone="error">{timetable.error ?? syllabus.error}</StatusMessage> : null}
        {actionError ? <StatusMessage tone="error">{actionError}</StatusMessage> : null}
        {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}

        <section className="grid gap-5 md:grid-cols-5">
          <MetricCard label="Active schedule" value={timetable.scheduleContext.activeProfileName} detail={getScheduleContextSummary(timetable.scheduleContext)} tone="gold" />
          <MetricCard label="Today" value={timetable.activeDayBlocks.length} detail="Active classes/study blocks" />
          <MetricCard label="Entries" value={timetable.blocks.length} detail="All timetable blocks" />
          <MetricCard label="Next block" value={timetable.nextBlock?.subject ?? "None"} detail={timetable.nextBlock ? `${timetable.nextBlock.startTime} - ${timetable.nextBlock.endTime}` : "Add a weekly entry"} />
          <MetricCard label="Total load" value={formatDuration(totalMinutes)} detail="Across all entries" />
        </section>

        <section className="card p-6 sm:p-8">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <p className="eyebrow">Active schedule</p>
              <h2 className="section-title">{getScheduleContextSummary(timetable.scheduleContext)}</h2>
              <p className="section-subtitle">
                Old timetable records default to weekly, Both, and Default Schedule. Activating a profile changes only profile state, not timetable entries.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {allProfiles.map((profile) => (
                <button
                  className={profile.id === timetable.scheduleContext.activeProfileId ? "btn-primary" : "btn-secondary"}
                  key={profile.id}
                  type="button"
                  onClick={() => activateProfile(profile.id)}
                  disabled={!hasAdvancedAccess && profile.id !== DEFAULT_SCHEDULE_PROFILE_ID}
                >
                  {profile.name}
                </button>
              ))}
            </div>
          </div>

          {hasAdvancedAccess && timetable.activeProfile.id !== DEFAULT_SCHEDULE_PROFILE_ID ? (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-3xl border border-forge-line bg-white p-4">
              {timetable.scheduleContext.scheduleMode === "alternateWeek" ? (
                <>
                  <span className="badge badge-open">Active Week {timetable.scheduleContext.activeWeek}</span>
                  {(["A", "B"] as const).map((week) => (
                    <button className="btn-ghost" key={week} type="button" onClick={() => updateActiveProfile({ activeWeek: week })}>
                      Use Week {week}
                    </button>
                  ))}
                </>
              ) : null}
              {timetable.scheduleContext.scheduleMode === "dayCycle" ? (
                <>
                  <span className="badge badge-open">Day {timetable.scheduleContext.activeCycleDay} of {timetable.scheduleContext.cycleLength}</span>
                  <button
                    className="btn-ghost"
                    type="button"
                    onClick={() => updateActiveProfile({ activeCycleDay: Math.max(1, timetable.scheduleContext.activeCycleDay - 1) })}
                  >
                    Previous day
                  </button>
                  <button
                    className="btn-ghost"
                    type="button"
                    onClick={() => updateActiveProfile({ activeCycleDay: timetable.scheduleContext.activeCycleDay >= timetable.scheduleContext.cycleLength ? 1 : timetable.scheduleContext.activeCycleDay + 1 })}
                  >
                    Next day
                  </button>
                </>
              ) : null}
              <span className="badge">{getScheduleModeLabel(timetable.scheduleContext.scheduleMode)}</span>
            </div>
          ) : null}
        </section>

        <section className="grid gap-6 xl:grid-cols-[26rem_1fr]">
          <div className="space-y-6">
            <form id="timetable-form" className="card space-y-5 p-6 sm:p-8" onSubmit={handleSubmit}>
              <div>
                <p className="eyebrow">{editingId ? "Edit entry" : "Add entry"}</p>
                <h2 className="section-title">Timetable block</h2>
              </div>
              <label className="grid gap-2">
                <span className="label">Subject</span>
                <select className="input" value={form.subjectId} onChange={(event) => {
                  const subject = syllabus.subjects.find((item) => item.id === event.target.value);
                  setForm({ ...form, subjectId: event.target.value, subject: subject?.name ?? form.subject, conflictIgnored: false });
                  setConflictWarning([]);
                }} required={!form.subject}>
                  <option value="">{form.subject ? `Legacy: ${form.subject}` : "Choose subject"}</option>
                  {syllabus.subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
                {syllabus.subjects.length === 0 ? (
                  <Link className="btn-ghost w-fit" href="/subjects">Create a subject first</Link>
                ) : null}
              </label>

              {hasAdvancedAccess ? (
                <div className="grid gap-3">
                  <label className="grid gap-2">
                    <span className="label">Schedule profile</span>
                    <select className="input" value={form.scheduleProfileId} onChange={(event) => {
                      const profile = allProfiles.find((item) => item.id === event.target.value) ?? allProfiles[0];
                      setForm({
                        ...form,
                        scheduleProfileId: profile.id,
                        scheduleProfileName: profile.name,
                        scheduleMode: profile.scheduleMode,
                        cycleLength: String(profile.cycleLength),
                        cycleDayNumber: String(profile.activeCycleDay),
                        weekGroup: profile.scheduleMode === "alternateWeek" ? form.weekGroup : "Both",
                        conflictIgnored: false
                      });
                      setConflictWarning([]);
                    }}>
                      {allProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} / {getScheduleModeLabel(profile.scheduleMode)}</option>)}
                    </select>
                  </label>
                  <div className="rounded-2xl border border-forge-line bg-white p-4">
                    <p className="text-sm font-bold text-forge-muted">Entry mode</p>
                    <p className="mt-1 text-base font-bold text-forge-text">{getScheduleModeLabel(selectedProfile.scheduleMode)}</p>
                    {selectedProfile.scheduleMode === "alternateWeek" ? (
                      <label className="mt-3 grid gap-2">
                        <span className="label">Week group</span>
                        <select className="input" value={form.weekGroup} onChange={(event) => {
                          setForm({ ...form, weekGroup: event.target.value as TimetableWeekGroup, conflictIgnored: false });
                          setConflictWarning([]);
                        }}>
                          {TIMETABLE_WEEK_GROUPS.map((week) => <option key={week} value={week}>{week === "Both" ? "Both weeks" : `Week ${week}`}</option>)}
                        </select>
                      </label>
                    ) : null}
                    {selectedProfile.scheduleMode === "dayCycle" ? (
                      <label className="mt-3 grid gap-2">
                        <span className="label">Cycle day</span>
                        <select className="input" value={form.cycleDayNumber} onChange={(event) => {
                          setForm({ ...form, cycleDayNumber: event.target.value, conflictIgnored: false });
                          setConflictWarning([]);
                        }}>
                          {Array.from({ length: selectedProfile.cycleLength }, (_, index) => index + 1).map((day) => (
                            <option key={day} value={day}>Day {day}</option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>
                </div>
              ) : (
                <UpgradePrompt compact requiredPlan="pro" title="Advanced timetable is Pro" description="Week A/B, cycle days, multiple profiles, and advanced filters unlock with Forge Pro. Normal weekly timetable stays free." />
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="label">Type</span>
                  <select className="input" value={form.classType} onChange={(event) => setForm({ ...form, classType: event.target.value as TimetableClassType, conflictIgnored: false })}>
                    {classTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="label">Day</span>
                  <select className="input" value={form.dayOfWeek} onChange={(event) => {
                    setForm({ ...form, dayOfWeek: Number(event.target.value), conflictIgnored: false });
                    setConflictWarning([]);
                  }}>
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                      <option key={day} value={day}>{getDayName(day)}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-2">
                  <span className="label">Start</span>
                  <input className="input" type="time" value={form.startTime} onChange={(event) => {
                    setForm({ ...form, startTime: event.target.value, conflictIgnored: false });
                    setConflictWarning([]);
                  }} required />
                </label>
                <label className="grid gap-2">
                  <span className="label">End</span>
                  <input className="input" type="time" value={form.endTime} onChange={(event) => {
                    setForm({ ...form, endTime: event.target.value, conflictIgnored: false });
                    setConflictWarning([]);
                  }} required />
                </label>
              </div>
              {hasAdvancedAccess ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="label">Effective from optional</span>
                    <input className="input" type="date" value={form.effectiveFrom} onChange={(event) => setForm({ ...form, effectiveFrom: event.target.value })} />
                  </label>
                  <label className="grid gap-2">
                    <span className="label">Effective until optional</span>
                    <input className="input" type="date" value={form.effectiveUntil} onChange={(event) => setForm({ ...form, effectiveUntil: event.target.value })} />
                  </label>
                </div>
              ) : null}
              <label className="grid gap-2">
                <span className="label">Teacher optional</span>
                <input className="input" value={form.teacherName} onChange={(event) => setForm({ ...form, teacherName: event.target.value })} placeholder="Instructor name" />
              </label>
              <label className="grid gap-2">
                <span className="label">Location optional</span>
                <input className="input" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Room, center, or link" />
              </label>
              <label className="grid gap-2">
                <span className="label">Notes optional</span>
                <textarea className="input min-h-24 resize-y" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Prep notes" />
              </label>
              {conflictWarning.length > 0 ? (
                <div className="status-box status-warning">
                  <p className="font-bold">Conflict warning</p>
                  <div className="mt-2 grid gap-2">
                    {conflictWarning.map((conflict) => (
                      <p key={conflict.conflictingBlock.id}>
                        Overlaps with {conflict.conflictingBlock.subject || conflict.conflictingBlock.title} at {conflict.conflictingBlock.startTime} - {conflict.conflictingBlock.endTime} ({conflict.contextLabel}).
                      </p>
                    ))}
                  </div>
                  <button className="btn-secondary mt-4" disabled={saving} type="button" onClick={() => saveTimetableEntry(true)}>
                    Save anyway
                  </button>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <button className="btn-primary" disabled={saving} type="submit">
                  {saving ? "Saving" : editingId ? "Save entry" : "Add entry"}
                </button>
                {editingId ? <button className="btn-ghost" type="button" onClick={resetForm}>Cancel</button> : null}
              </div>
            </form>

            <section className="card space-y-5 p-6 sm:p-8">
              <div>
                <p className="eyebrow">Schedule profiles</p>
                <h2 className="section-title">Profiles and rotation</h2>
              </div>
              {hasAdvancedAccess ? (
                <>
                  <form className="grid gap-4" onSubmit={handleProfileSubmit}>
                    <label className="grid gap-2">
                      <span className="label">Profile name</span>
                      <input className="input" value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} placeholder="School Week A/B" required />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="label">Profile type</span>
                        <select className="input" value={profileForm.type} onChange={(event) => setProfileForm({ ...profileForm, type: event.target.value as ScheduleProfileType })}>
                          {SCHEDULE_PROFILE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </label>
                      <label className="grid gap-2">
                        <span className="label">Schedule mode</span>
                        <select className="input" value={profileForm.scheduleMode} onChange={(event) => setProfileForm({ ...profileForm, scheduleMode: event.target.value as TimetableScheduleMode })}>
                          <option value="weekly">Normal weekly</option>
                          <option value="alternateWeek">Week A/B</option>
                          <option value="dayCycle">Day cycle</option>
                        </select>
                      </label>
                    </div>
                    {profileForm.scheduleMode === "alternateWeek" ? (
                      <label className="grid gap-2">
                        <span className="label">Active week</span>
                        <select className="input" value={profileForm.activeWeek} onChange={(event) => setProfileForm({ ...profileForm, activeWeek: event.target.value as "A" | "B" })}>
                          <option value="A">Week A</option>
                          <option value="B">Week B</option>
                        </select>
                      </label>
                    ) : null}
                    {profileForm.scheduleMode === "dayCycle" ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-2">
                          <span className="label">Cycle length</span>
                          <input className="input" min="2" max="14" type="number" value={profileForm.cycleLength} onChange={(event) => setProfileForm({ ...profileForm, cycleLength: event.target.value })} />
                        </label>
                        <label className="grid gap-2">
                          <span className="label">Active cycle day</span>
                          <input className="input" min="1" max={profileForm.cycleLength || 14} type="number" value={profileForm.activeCycleDay} onChange={(event) => setProfileForm({ ...profileForm, activeCycleDay: event.target.value })} />
                        </label>
                      </div>
                    ) : null}
                    <div className="grid gap-2">
                      <span className="label">Color</span>
                      <div className="grid grid-cols-6 gap-2">
                        {profileColors.map((color) => (
                          <button
                            aria-label={`Use profile color ${color}`}
                            className={profileForm.color === color ? "h-11 rounded-2xl ring-4 ring-forge-gold/25" : "h-11 rounded-2xl ring-1 ring-forge-line"}
                            key={color}
                            style={{ backgroundColor: color }}
                            type="button"
                            onClick={() => setProfileForm({ ...profileForm, color })}
                          />
                        ))}
                      </div>
                    </div>
                    <label className="grid gap-2">
                      <span className="label">Description optional</span>
                      <textarea className="input min-h-20 resize-y" value={profileForm.description} onChange={(event) => setProfileForm({ ...profileForm, description: event.target.value })} />
                    </label>
                    {!editingProfileId && profileLimitReached ? <LimitReachedNotice currentPlan={plan.plan} limitLabel="Your current plan has reached its schedule profile limit." usageLabel={profileUsage.label} /> : null}
                    <div className="flex flex-wrap gap-3">
                      <button className="btn-primary" disabled={profileSaving || (!editingProfileId && profileLimitReached)} type="submit">
                        {profileSaving ? "Saving" : editingProfileId ? "Save profile" : "Create profile"}
                      </button>
                      {editingProfileId ? <button className="btn-ghost" type="button" onClick={resetProfileForm}>Cancel</button> : null}
                    </div>
                  </form>
                  <div className="grid gap-3">
                    {allProfiles.map((profile) => (
                      <div className="rounded-2xl border border-forge-line bg-white p-4" key={profile.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-forge-text">{profile.name}</p>
                            <p className="mt-1 text-sm font-semibold text-forge-muted">{profile.type} / {getScheduleModeLabel(profile.scheduleMode)}</p>
                          </div>
                          {profile.id === timetable.scheduleContext.activeProfileId ? <span className="badge badge-open">Active</span> : <span className="badge">Saved</span>}
                        </div>
                        {profile.id !== DEFAULT_SCHEDULE_PROFILE_ID ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button className="btn-ghost" type="button" onClick={() => editProfile(profile)}>Edit</button>
                            <button className="btn-ghost" type="button" onClick={() => activateProfile(profile.id)}>Activate</button>
                            <button className="btn-ghost" type="button" onClick={() => deleteProfile(profile)}>Delete</button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <UpgradePrompt compact requiredPlan="pro" title="Profiles unlock with Forge Pro" description="Create School, Coaching, Exam Week, Vacation, or custom rotating schedules without changing your existing weekly entries." />
              )}
            </section>
          </div>

          <section className="space-y-5">
            {!dataReady || timetable.loading || syllabus.loading ? (
              <LoadingState label="Loading timetable" mode="inline" />
            ) : timetable.blocks.length === 0 ? (
              <EmptyState
                title="No timetable entries yet"
                description="Add your first weekly class or study block and FocusForge will surface the active schedule."
                action={<a className="btn-primary" href="#timetable-form">Add timetable entry</a>}
              />
            ) : view === "active" ? (
              <ActiveDayView groupedActiveDay={groupedActiveDay} onDelete={handleDelete} onDuplicate={duplicateBlock} onEdit={editBlock} timetable={timetable} />
            ) : view === "week" ? (
              <WeekView weekDates={weekDates} onDelete={handleDelete} onDuplicate={duplicateBlock} onEdit={editBlock} timetable={timetable} />
            ) : (
              <ListView
                blocks={visibleListBlocks}
                profileFilter={profileFilter}
                profiles={allProfiles}
                subjectFilter={subjectFilter}
                subjects={syllabus.subjects}
                typeFilter={typeFilter}
                onDelete={handleDelete}
                onDuplicate={duplicateBlock}
                onEdit={editBlock}
                onProfileFilter={setProfileFilter}
                onSubjectFilter={setSubjectFilter}
                onTypeFilter={setTypeFilter}
                timetable={timetable}
              />
            )}
          </section>
        </section>
      </main>
      {confirmDialog}
    </>
  );
}

function ActiveDayView({
  groupedActiveDay,
  timetable,
  onEdit,
  onDelete,
  onDuplicate
}: {
  groupedActiveDay: Array<{ period: string; blocks: TimetableBlock[] }>;
  timetable: ReturnType<typeof useTimetable>;
  onEdit: (block: TimetableBlock) => void;
  onDelete: (block: TimetableBlock) => void;
  onDuplicate: (block: TimetableBlock) => void;
}) {
  return (
    <div className="space-y-4">
      {groupedActiveDay.map(({ period, blocks }) => (
        <div className="card p-6" key={period}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-forge-text">{period}</h2>
              <p className="mt-1 text-sm font-semibold text-forge-muted">{getScheduleContextSummary(timetable.scheduleContext)}</p>
            </div>
            <span className="badge">{blocks.length} entries</span>
          </div>
          <div className="mt-4 space-y-3">
            {blocks.length === 0 ? (
              <p className="text-base text-forge-muted">No {period.toLowerCase()} class or study block in the active schedule.</p>
            ) : (
              blocks.map((block) => <TimetableBlockCard block={block} key={block.id} onDelete={onDelete} onDuplicate={onDuplicate} onEdit={onEdit} timetable={timetable} />)
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function WeekView({
  weekDates,
  timetable,
  onEdit,
  onDelete,
  onDuplicate
}: {
  weekDates: string[];
  timetable: ReturnType<typeof useTimetable>;
  onEdit: (block: TimetableBlock) => void;
  onDelete: (block: TimetableBlock) => void;
  onDuplicate: (block: TimetableBlock) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
      {weekDates.map((date) => {
        const dayBlocks = timetable.getBlocksForDate(date);
        const isToday = date === getTodayDateKey();

        return (
          <div className={isToday ? "card border-forge-gold p-5" : "card p-5"} key={date}>
            <p className="eyebrow">{getDayName(parseDateKey(date).getDay(), "short")}</p>
            <h3 className="mt-1 text-lg font-bold text-forge-text">{formatShortDate(date)}</h3>
            <div className="mt-4 space-y-3">
              {dayBlocks.length === 0 ? (
                <p className="text-base text-forge-muted">Open</p>
              ) : (
                dayBlocks.map((block) => <TimetableBlockCard compact block={block} key={block.id} onDelete={onDelete} onDuplicate={onDuplicate} onEdit={onEdit} timetable={timetable} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({
  blocks,
  subjects,
  profiles,
  subjectFilter,
  profileFilter,
  typeFilter,
  timetable,
  onSubjectFilter,
  onProfileFilter,
  onTypeFilter,
  onEdit,
  onDelete,
  onDuplicate
}: {
  blocks: TimetableBlock[];
  subjects: Array<{ id: string; name: string }>;
  profiles: ScheduleProfile[];
  subjectFilter: string;
  profileFilter: string;
  typeFilter: string;
  timetable: ReturnType<typeof useTimetable>;
  onSubjectFilter: (value: string) => void;
  onProfileFilter: (value: string) => void;
  onTypeFilter: (value: string) => void;
  onEdit: (block: TimetableBlock) => void;
  onDelete: (block: TimetableBlock) => void;
  onDuplicate: (block: TimetableBlock) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="card p-5 sm:p-6">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <label className="grid gap-2">
            <span className="label">Subject</span>
            <select className="input" value={subjectFilter} onChange={(event) => onSubjectFilter(event.target.value)}>
              <option value="">All subjects</option>
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="label">Profile</span>
            <select className="input" value={profileFilter} onChange={(event) => onProfileFilter(event.target.value)}>
              <option value="">All profiles</option>
              {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="label">Type</span>
            <select className="input" value={typeFilter} onChange={(event) => onTypeFilter(event.target.value)}>
              <option value="">All types</option>
              {classTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <button className="btn-ghost self-end" type="button" onClick={() => {
            onSubjectFilter("");
            onProfileFilter("");
            onTypeFilter("");
          }}>
            Reset
          </button>
        </div>
      </div>
      {blocks.length === 0 ? (
        <EmptyState title="No entries match these filters" description="Reset filters or add a timetable entry." />
      ) : (
        <div className="grid gap-3">
          {blocks.map((block) => <TimetableBlockCard block={block} key={block.id} onDelete={onDelete} onDuplicate={onDuplicate} onEdit={onEdit} timetable={timetable} />)}
        </div>
      )}
    </div>
  );
}

function TimetableBlockCard({
  block,
  compact,
  timetable,
  onDelete,
  onEdit,
  onDuplicate
}: {
  block: TimetableBlock;
  compact?: boolean;
  timetable: ReturnType<typeof useTimetable>;
  onDelete: (block: TimetableBlock) => void;
  onEdit: (block: TimetableBlock) => void;
  onDuplicate: (block: TimetableBlock) => void;
}) {
  const conflicts = timetable.getConflictsForBlock(block);

  return (
    <article className="rounded-3xl border border-forge-line bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-forge-text">{block.subject || block.title}</h3>
          <p className="mt-1 text-base text-forge-muted">
            {block.startTime} - {block.endTime} / {formatDuration(block.duration)}
          </p>
          <p className="mt-1 text-sm font-bold text-forge-gold">{block.classType ?? "Study block"}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="badge badge-open">{getDayName(block.dayOfWeek, "short")}</span>
          {conflicts.length > 0 ? <span className="badge badge-open">Conflict</span> : null}
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold text-forge-muted">{getTimetableScheduleLabel(block)}</p>
      {!compact && (block.teacherName || block.location) ? (
        <p className="mt-3 text-base text-forge-muted">
          {[block.teacherName, block.location].filter(Boolean).join(" / ")}
        </p>
      ) : null}
      {!compact && block.notes ? <p className="mt-3 text-base leading-7 text-forge-muted">{block.notes}</p> : null}
      {!compact && conflicts.length > 0 ? (
        <p className="mt-3 text-sm font-semibold text-forge-muted">
          Overlaps with {conflicts.map((conflict) => conflict.conflictingBlock.subject || conflict.conflictingBlock.title).join(", ")}.
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-ghost" type="button" onClick={() => onEdit(block)}>Edit</button>
        <button className="btn-ghost" type="button" onClick={() => onDuplicate(block)}>Duplicate</button>
        <button className="btn-ghost" type="button" onClick={() => onDelete(block)}>Delete</button>
      </div>
    </article>
  );
}

export default function TimetablePage() {
  return (
    <AuthGuard>
      <TimetableContent />
    </AuthGuard>
  );
}
