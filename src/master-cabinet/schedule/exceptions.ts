import { addDays } from "@/booking/dates";
import { formatHours, type Interval, mergeIntervals } from "./hours";

export type ExceptionDay = { day: string; hours: Interval[] };
export type ExceptionPeriod = { from: string; to: string; hours: Interval[] };

export const maxPeriodDays = 365;

const hoursKey = (hours: Interval[]) => formatHours(mergeIntervals(hours));

// Past days are left out, so a period that began earlier starts at today.
export function groupExceptions(
  days: ExceptionDay[],
  today: string,
): ExceptionPeriod[] {
  const upcoming = days
    .filter((d) => d.day >= today)
    .sort((a, b) => a.day.localeCompare(b.day));
  const periods: ExceptionPeriod[] = [];
  for (const { day, hours } of upcoming) {
    const last = periods.at(-1);
    if (last && last.to === day) {
      continue;
    }
    if (
      last &&
      addDays(last.to, 1) === day &&
      hoursKey(last.hours) === hoursKey(hours)
    ) {
      last.to = day;
    } else {
      periods.push({ from: day, to: day, hours });
    }
  }
  return periods;
}

export function periodLength(from: string, to: string): number {
  const ms =
    new Date(`${to}T12:00:00Z`).getTime() -
    new Date(`${from}T12:00:00Z`).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

export function overlappingPeriods<P extends ExceptionPeriod>(
  periods: P[],
  from: string,
  to: string,
  except: ExceptionPeriod | null,
): P[] {
  return periods.filter(
    (p) =>
      p.from <= to &&
      p.to >= from &&
      !(except && p.from === except.from && p.to === except.to),
  );
}
