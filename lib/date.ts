export function getDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day);
}

export function getTodayDateKey(): string {
  return getDateKey();
}

export function getYesterdayDateKey(referenceDate = new Date()): string {
  const yesterday = new Date(referenceDate);
  yesterday.setDate(referenceDate.getDate() - 1);

  return getDateKey(yesterday);
}

export function isToday(dateKey: string): boolean {
  return dateKey === getTodayDateKey();
}

export function isYesterday(dateKey: string, referenceDate = new Date()): boolean {
  return dateKey === getYesterdayDateKey(referenceDate);
}

export function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);

  return nextDate;
}

export function getStartOfWeek(date = new Date()): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(date.getDate() - date.getDay());

  return start;
}

export function getEndOfWeek(date = new Date()): Date {
  return addDays(getStartOfWeek(date), 6);
}

export function getStartOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getEndOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function getMonthDateRange(date = new Date()): { start: string; end: string } {
  return {
    start: getDateKey(getStartOfMonth(date)),
    end: getDateKey(getEndOfMonth(date))
  };
}

export function getWeekDateRange(date = new Date()): { start: string; end: string } {
  return {
    start: getDateKey(getStartOfWeek(date)),
    end: getDateKey(getEndOfWeek(date))
  };
}

export function getWeekKey(date = new Date()): string {
  const range = getWeekDateRange(date);

  return `${range.start}_${range.end}`;
}

export function getWeekDateKeys(date = new Date()): string[] {
  const range = getWeekDateRange(date);

  return getDateKeysBetween(range.start, range.end);
}

export function getDateKeysBetween(startDateKey: string, endDateKey: string): string[] {
  const keys: string[] = [];
  let cursor = parseDateKey(startDateKey);
  const end = parseDateKey(endDateKey);

  while (cursor <= end) {
    keys.push(getDateKey(cursor));
    cursor = addDays(cursor, 1);
  }

  return keys;
}

export function formatLongDate(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

export function formatShortDate(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

export function getDayName(dayOfWeek: number, format: "long" | "short" = "long"): string {
  const referenceSunday = new Date(2026, 3, 26 + dayOfWeek);

  return referenceSunday.toLocaleDateString(undefined, { weekday: format });
}

export function minutesFromTime(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return Number.NaN;
  }

  return hours * 60 + minutes;
}

export function getDurationBetweenTimes(startTime: string, endTime: string): number {
  return minutesFromTime(endTime) - minutesFromTime(startTime);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
