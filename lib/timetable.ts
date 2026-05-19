import { getDateKey, getDayName, getDurationBetweenTimes, getTodayDateKey, minutesFromTime, parseDateKey } from "@/lib/date";
import type {
  ScheduleProfile,
  ScheduleProfileType,
  TimetableBlock,
  TimetableScheduleMode,
  TimetableWeekGroup
} from "@/types";

export const DEFAULT_SCHEDULE_PROFILE_ID = "default";
export const DEFAULT_SCHEDULE_PROFILE_NAME = "Default Schedule";

export const TIMETABLE_SCHEDULE_MODES: TimetableScheduleMode[] = ["weekly", "alternateWeek", "dayCycle"];
export const TIMETABLE_WEEK_GROUPS: TimetableWeekGroup[] = ["A", "B", "Both"];
export const SCHEDULE_PROFILE_TYPES: ScheduleProfileType[] = [
  "School",
  "Coaching",
  "Self-study",
  "Exam Week",
  "Vacation",
  "Custom"
];

export interface TimetableScheduleContext {
  profiles: ScheduleProfile[];
  activeProfile: ScheduleProfile;
  activeProfileId: string;
  activeProfileName: string;
  scheduleMode: TimetableScheduleMode;
  activeWeek: Exclude<TimetableWeekGroup, "Both">;
  cycleLength: number;
  activeCycleDay: number;
  hasStoredProfiles: boolean;
}

export interface TimetableConflict {
  block: TimetableBlock;
  conflictingBlock: TimetableBlock;
  contextLabel: string;
  timeRange: string;
}

export type TimetableBlockDraft = Pick<
  TimetableBlock,
  | "title"
  | "subject"
  | "dayOfWeek"
  | "startTime"
  | "endTime"
  | "isRecurring"
> & { id?: string } &
  Partial<TimetableBlock>;

export function normalizeTimetableScheduleMode(value: unknown): TimetableScheduleMode {
  return TIMETABLE_SCHEDULE_MODES.includes(value as TimetableScheduleMode)
    ? (value as TimetableScheduleMode)
    : "weekly";
}

export function normalizeTimetableWeekGroup(value: unknown): TimetableWeekGroup {
  return TIMETABLE_WEEK_GROUPS.includes(value as TimetableWeekGroup) ? (value as TimetableWeekGroup) : "Both";
}

export function normalizeScheduleProfileType(value: unknown): ScheduleProfileType {
  return SCHEDULE_PROFILE_TYPES.includes(value as ScheduleProfileType) ? (value as ScheduleProfileType) : "School";
}

export function normalizeCycleLength(value: unknown): number {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue < 2) {
    return 5;
  }

  return Math.min(14, numericValue);
}

export function normalizeCycleDay(value: unknown, cycleLength: number): number {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue < 1) {
    return 1;
  }

  return Math.min(cycleLength, numericValue);
}

export function getVirtualDefaultScheduleProfile(userId = ""): ScheduleProfile {
  return {
    id: DEFAULT_SCHEDULE_PROFILE_ID,
    userId,
    name: DEFAULT_SCHEDULE_PROFILE_NAME,
    type: "School",
    color: "#C9A46C",
    description: "Compatible default for normal weekly timetable entries.",
    isActive: true,
    scheduleMode: "weekly",
    activeWeek: "A",
    cycleLength: 5,
    activeCycleDay: 1,
    createdAt: null,
    updatedAt: null
  };
}

export function getTimetableScheduleContext(profiles: ScheduleProfile[], userId = ""): TimetableScheduleContext {
  const virtualDefault = getVirtualDefaultScheduleProfile(userId);
  const activeProfile = profiles.find((profile) => profile.isActive) ?? profiles[0] ?? virtualDefault;
  const cycleLength = normalizeCycleLength(activeProfile.cycleLength);

  return {
    profiles,
    activeProfile,
    activeProfileId: activeProfile.id,
    activeProfileName: activeProfile.name,
    scheduleMode: normalizeTimetableScheduleMode(activeProfile.scheduleMode),
    activeWeek: activeProfile.activeWeek === "B" ? "B" : "A",
    cycleLength,
    activeCycleDay: normalizeCycleDay(activeProfile.activeCycleDay, cycleLength),
    hasStoredProfiles: profiles.length > 0
  };
}

export function normalizeTimetableBlockSchedule(block: TimetableBlockDraft): TimetableBlockDraft {
  const scheduleMode = normalizeTimetableScheduleMode(block.scheduleMode);
  const cycleLength = block.cycleLength ? normalizeCycleLength(block.cycleLength) : null;

  return {
    ...block,
    scheduleMode,
    scheduleProfileId: block.scheduleProfileId?.trim() || DEFAULT_SCHEDULE_PROFILE_ID,
    scheduleProfileName: block.scheduleProfileName?.trim() || DEFAULT_SCHEDULE_PROFILE_NAME,
    weekGroup: normalizeTimetableWeekGroup(block.weekGroup),
    cycleLength,
    cycleDayNumber: block.cycleDayNumber ? normalizeCycleDay(block.cycleDayNumber, cycleLength ?? 5) : null,
    effectiveFrom: block.effectiveFrom?.trim() ?? "",
    effectiveUntil: block.effectiveUntil?.trim() ?? "",
    isActive: block.isActive !== false,
    conflictIgnored: Boolean(block.conflictIgnored)
  };
}

function sortBlocks(blocks: TimetableBlock[]): TimetableBlock[] {
  return [...blocks].sort((a, b) => a.startTime.localeCompare(b.startTime) || a.subject.localeCompare(b.subject));
}

function sameProfile(block: TimetableBlockDraft, context: TimetableScheduleContext, includeAllProfiles = false): boolean {
  if (includeAllProfiles) {
    return true;
  }

  const profileId = normalizeTimetableBlockSchedule(block).scheduleProfileId;

  return profileId === context.activeProfileId;
}

function inEffectiveRange(block: TimetableBlockDraft, dateKey: string): boolean {
  const effectiveFrom = block.effectiveFrom?.trim();
  const effectiveUntil = block.effectiveUntil?.trim();

  if (effectiveFrom && dateKey < effectiveFrom) {
    return false;
  }

  if (effectiveUntil && dateKey > effectiveUntil) {
    return false;
  }

  return true;
}

function basicWeeklyMatch(block: TimetableBlockDraft, dateKey: string): boolean {
  const date = block.date?.trim();

  if (date && block.isRecurring === false) {
    return date === dateKey;
  }

  return Number(block.dayOfWeek) === parseDateKey(dateKey).getDay();
}

export function timetableBlockOccursOnDate(
  block: TimetableBlock,
  dateKey: string,
  context: TimetableScheduleContext,
  options: { includeAllProfiles?: boolean; includeAllAlternateWeeks?: boolean } = {}
): boolean {
  const normalized = normalizeTimetableBlockSchedule(block);

  if (normalized.isActive === false || !sameProfile(normalized, context, options.includeAllProfiles) || !inEffectiveRange(normalized, dateKey)) {
    return false;
  }

  if (normalized.scheduleMode === "alternateWeek") {
    const weekGroup = normalizeTimetableWeekGroup(normalized.weekGroup);
    const matchesWeek = options.includeAllAlternateWeeks || weekGroup === "Both" || weekGroup === context.activeWeek;

    return matchesWeek && basicWeeklyMatch(normalized, dateKey);
  }

  if (normalized.scheduleMode === "dayCycle") {
    return dateKey === getTodayDateKey() && Number(normalized.cycleDayNumber ?? 0) === context.activeCycleDay;
  }

  return basicWeeklyMatch(normalized, dateKey);
}

export function resolveTimetableBlocksForDate(
  blocks: TimetableBlock[],
  dateKey: string,
  context: TimetableScheduleContext,
  options: { includeAllProfiles?: boolean; includeAllAlternateWeeks?: boolean } = {}
): TimetableBlock[] {
  return sortBlocks(blocks.filter((block) => timetableBlockOccursOnDate(block, dateKey, context, options)));
}

export function resolveActiveCycleBlocks(blocks: TimetableBlock[], context: TimetableScheduleContext): TimetableBlock[] {
  return sortBlocks(
    blocks.filter((block) => {
      const normalized = normalizeTimetableBlockSchedule(block);

      return normalized.isActive !== false &&
        normalized.scheduleMode === "dayCycle" &&
        normalized.scheduleProfileId === context.activeProfileId &&
        Number(normalized.cycleDayNumber ?? 0) === context.activeCycleDay;
    })
  );
}

export function getNextTimetableBlock(
  blocks: TimetableBlock[],
  context: TimetableScheduleContext,
  now = new Date()
): TimetableBlock | null {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const today = getDateKey(now);
  const todayBlocks = resolveTimetableBlocksForDate(blocks, today, context);
  const upcomingToday = todayBlocks.find((block) => minutesFromTime(block.startTime) >= currentMinutes);

  if (upcomingToday) {
    return upcomingToday;
  }

  if (context.scheduleMode === "dayCycle") {
    return resolveActiveCycleBlocks(blocks, context)[0] ?? null;
  }

  for (let offset = 1; offset <= 7; offset += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() + offset);
    const dayBlocks = resolveTimetableBlocksForDate(blocks, getDateKey(date), context);

    if (dayBlocks.length > 0) {
      return dayBlocks[0];
    }
  }

  return null;
}

function weekGroupsOverlap(a: TimetableWeekGroup, b: TimetableWeekGroup): boolean {
  return a === "Both" || b === "Both" || a === b;
}

function timeOverlaps(a: TimetableBlockDraft, b: TimetableBlockDraft): boolean {
  const aStart = minutesFromTime(a.startTime);
  const aEnd = minutesFromTime(a.endTime);
  const bStart = minutesFromTime(b.startTime);
  const bEnd = minutesFromTime(b.endTime);

  return Number.isFinite(aStart) && Number.isFinite(aEnd) && Number.isFinite(bStart) && Number.isFinite(bEnd) && aStart < bEnd && bStart < aEnd;
}

function sameConflictContext(a: TimetableBlockDraft, b: TimetableBlockDraft): boolean {
  const left = normalizeTimetableBlockSchedule(a);
  const right = normalizeTimetableBlockSchedule(b);

  if (left.scheduleProfileId !== right.scheduleProfileId || left.scheduleMode !== right.scheduleMode) {
    return false;
  }

  if (left.scheduleMode === "alternateWeek") {
    return left.dayOfWeek === right.dayOfWeek && weekGroupsOverlap(normalizeTimetableWeekGroup(left.weekGroup), normalizeTimetableWeekGroup(right.weekGroup));
  }

  if (left.scheduleMode === "dayCycle") {
    return Number(left.cycleDayNumber ?? 0) === Number(right.cycleDayNumber ?? 0);
  }

  return left.dayOfWeek === right.dayOfWeek;
}

export function getTimetableConflicts(
  draft: TimetableBlockDraft,
  blocks: TimetableBlock[],
  exceptId?: string
): TimetableConflict[] {
  const normalizedDraft = normalizeTimetableBlockSchedule(draft);

  if (normalizedDraft.isActive === false) {
    return [];
  }

  return blocks
    .filter((block) => block.id !== exceptId && normalizeTimetableBlockSchedule(block).isActive !== false)
    .filter((block) => sameConflictContext(normalizedDraft, block) && timeOverlaps(normalizedDraft, block))
    .map((block) => ({
      block: normalizedDraft as TimetableBlock,
      conflictingBlock: block,
      contextLabel: getTimetableContextLabel(normalizedDraft as TimetableBlock),
      timeRange: `${normalizedDraft.startTime} - ${normalizedDraft.endTime}`
    }));
}

export function getTimetableContextLabel(block: TimetableBlock): string {
  const normalized = normalizeTimetableBlockSchedule(block);

  if (normalized.scheduleMode === "alternateWeek") {
    return `${getDayName(Number(normalized.dayOfWeek), "short")} / Week ${normalizeTimetableWeekGroup(normalized.weekGroup)}`;
  }

  if (normalized.scheduleMode === "dayCycle") {
    return `Day ${normalized.cycleDayNumber ?? 1}`;
  }

  return getDayName(Number(normalized.dayOfWeek), "short");
}

export function getTimetableScheduleLabel(block: TimetableBlock): string {
  const normalized = normalizeTimetableBlockSchedule(block);
  const profile = normalized.scheduleProfileName ?? DEFAULT_SCHEDULE_PROFILE_NAME;

  if (normalized.scheduleMode === "alternateWeek") {
    return `${profile} / Week ${normalizeTimetableWeekGroup(normalized.weekGroup)}`;
  }

  if (normalized.scheduleMode === "dayCycle") {
    return `${profile} / Day ${normalized.cycleDayNumber ?? 1}`;
  }

  return `${profile} / Weekly`;
}

export function getScheduleModeLabel(mode: TimetableScheduleMode): string {
  if (mode === "alternateWeek") {
    return "Week A/B";
  }

  if (mode === "dayCycle") {
    return "Day cycle";
  }

  return "Weekly";
}

export function getScheduleContextSummary(context: TimetableScheduleContext): string {
  if (context.scheduleMode === "alternateWeek") {
    return `${context.activeProfileName} / Week ${context.activeWeek}`;
  }

  if (context.scheduleMode === "dayCycle") {
    return `${context.activeProfileName} / Day ${context.activeCycleDay} of ${context.cycleLength}`;
  }

  return `${context.activeProfileName} / Weekly`;
}

export function getTimetableDuration(input: Pick<TimetableBlockDraft, "startTime" | "endTime">): number {
  const duration = getDurationBetweenTimes(input.startTime, input.endTime);

  return Number.isFinite(duration) && duration > 0 ? duration : 0;
}
