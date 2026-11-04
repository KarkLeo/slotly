import { addDays, localDate } from "@/booking/dates";
import type { ExceptionDay, ExceptionPeriod } from "./exceptions";
import { type Interval, mergeIntervals, timeLabel } from "./hours";

export type UpcomingAppointment = {
  id: string;
  clientName: string | null;
  startsAt: string;
  endsAt: string;
};

export type LocalAppointment = {
  id: string;
  clientName: string | null;
  date: string;
  startLabel: string;
  endLabel: string;
  parts: { date: string; start: number; end: number }[];
};

export type Schedule = {
  template: Record<number, Interval[]>;
  exceptions: ExceptionDay[];
};

const dayMinutes = 1440;

function localMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hourCycle: "h23",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(instant);
  const part = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return part("hour") * 60 + part("minute");
}

export function toLocalAppointment(
  row: UpcomingAppointment,
  timeZone: string,
): LocalAppointment {
  const startsAt = new Date(row.startsAt);
  const endsAt = new Date(row.endsAt);
  const date = localDate(startsAt, timeZone);
  const endDate = localDate(endsAt, timeZone);
  const start = localMinutes(startsAt, timeZone);
  const end = localMinutes(endsAt, timeZone);
  let parts: LocalAppointment["parts"];
  if (endDate === date) {
    parts = [{ date, start, end }];
  } else if (end === 0 && endDate === addDays(date, 1)) {
    parts = [{ date, start, end: dayMinutes }];
  } else {
    parts = [
      { date, start, end: dayMinutes },
      { date: endDate, start: 0, end },
    ];
  }
  return {
    id: row.id,
    clientName: row.clientName,
    date,
    startLabel: timeLabel(start),
    endLabel: timeLabel(end),
    parts,
  };
}

// 1 is Monday, 7 is Sunday, as in work_template.weekday.
export function isoWeekday(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay() || 7;
}

function templateHours(schedule: Schedule, date: string): Interval[] {
  return schedule.template[isoWeekday(date)] ?? [];
}

// hoursOf returns null for a date the change does not affect.
function outside(
  appointments: LocalAppointment[],
  hoursOf: (date: string) => Interval[] | null,
): LocalAppointment[] {
  return appointments.filter((appointment) =>
    appointment.parts.some((part) => {
      const hours = hoursOf(part.date);
      return (
        hours !== null &&
        !mergeIntervals(hours).some(
          (i) => i.start <= part.start && part.end <= i.end,
        )
      );
    }),
  );
}

export function outsideAfterTemplateChange(
  appointments: LocalAppointment[],
  schedule: Schedule,
  weekdays: number[],
  hours: Interval[],
): LocalAppointment[] {
  const excepted = new Set(schedule.exceptions.map((e) => e.day));
  return outside(appointments, (date) =>
    weekdays.includes(isoWeekday(date)) && !excepted.has(date) ? hours : null,
  );
}

export function outsideAfterExceptionChange(
  appointments: LocalAppointment[],
  schedule: Schedule,
  change: {
    from: string;
    to: string;
    hours: Interval[];
    replaced: ExceptionPeriod | null;
  },
): LocalAppointment[] {
  const { from, to, hours, replaced } = change;
  return outside(appointments, (date) => {
    if (date >= from && date <= to) return hours;
    if (replaced && date >= replaced.from && date <= replaced.to) {
      return templateHours(schedule, date);
    }
    return null;
  });
}

export function outsideAfterExceptionDelete(
  appointments: LocalAppointment[],
  schedule: Schedule,
  period: ExceptionPeriod,
): LocalAppointment[] {
  return outside(appointments, (date) =>
    date >= period.from && date <= period.to
      ? templateHours(schedule, date)
      : null,
  );
}

export function outsideInPeriod(
  appointments: LocalAppointment[],
  period: ExceptionPeriod,
): LocalAppointment[] {
  return outside(appointments, (date) =>
    date >= period.from && date <= period.to ? period.hours : null,
  );
}
