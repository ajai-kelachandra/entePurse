import { format, getDaysInMonth, differenceInCalendarDays } from "date-fns";

export const ymd = (d: Date) => format(d, "yyyy-MM-dd");
export const ym = (d: Date) => format(d, "yyyy-MM");

/** Parse yyyy-MM-dd as a local date (avoids UTC shift). */
export function parseYmd(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const monthOf = (dateStr: string) => dateStr.slice(0, 7);

/** Days left in month including today. */
export function daysLeftInMonth(d = new Date()) {
  return getDaysInMonth(d) - d.getDate() + 1;
}

export function clampDay(year: number, monthIndex: number, day: number) {
  return Math.min(day, getDaysInMonth(new Date(year, monthIndex, 1)));
}

/** Next occurrence (today or later) of a day-of-month. */
export function nextOccurrence(day: number, from = new Date()): Date {
  const y = from.getFullYear(), m = from.getMonth();
  const thisMonth = new Date(y, m, clampDay(y, m, day));
  const today = new Date(y, m, from.getDate());
  if (thisMonth >= today) return thisMonth;
  const ny = m === 11 ? y + 1 : y, nm = (m + 1) % 12;
  return new Date(ny, nm, clampDay(ny, nm, day));
}

export function addMonths(monthStr: string, n: number) {
  const [y, m] = monthStr.split("-").map(Number);
  return ym(new Date(y, m - 1 + n, 1));
}

/* ---- Pay cycles: run from the salary day to the day before the next one ---- */

export function cycleStart(salaryDay: number, ref = new Date()): Date {
  const y = ref.getFullYear(), m = ref.getMonth();
  if (ref.getDate() >= clampDay(y, m, salaryDay)) return new Date(y, m, clampDay(y, m, salaryDay));
  const py = m === 0 ? y - 1 : y, pm = (m + 11) % 12;
  return new Date(py, pm, clampDay(py, pm, salaryDay));
}

/** Cycle key is the yyyy-MM of the month the cycle starts in. */
export const cycleKey = (salaryDay: number, ref = new Date()) => ym(cycleStart(salaryDay, ref));

export function cycleBounds(key: string, salaryDay: number) {
  const [y, m] = key.split("-").map(Number);
  const start = new Date(y, m - 1, clampDay(y, m - 1, salaryDay));
  const end = new Date(y, m, clampDay(y, m, salaryDay)); // exclusive: next salary day
  return { start: ymd(start), end: ymd(end), startDate: start, endDate: end };
}

export function inCycle(dateStr: string, key: string, salaryDay: number) {
  const b = cycleBounds(key, salaryDay);
  return dateStr >= b.start && dateStr < b.end;
}

export function daysLeftInCycle(salaryDay: number, ref = new Date()) {
  const { endDate } = cycleBounds(cycleKey(salaryDay, ref), salaryDay);
  return differenceInCalendarDays(endDate, ref);
}

export function cycleLabel(key: string, salaryDay: number) {
  const { startDate, endDate } = cycleBounds(key, salaryDay);
  return `${format(startDate, "d MMM")} – ${format(new Date(endDate.getTime() - 86400000), "d MMM yyyy")}`;
}
