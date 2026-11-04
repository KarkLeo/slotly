import { addDays, localDate, zoneLabel } from "@/booking/dates";
import type { Locale } from "@/i18n/locales";
import { formatDuration } from "@/landing/format";
import {
  type LocalAppointment,
  outsideInPeriod,
  type Schedule,
  toLocalAppointment,
  type UpcomingAppointment,
} from "./conflicts";
import {
  type ExceptionDay,
  type ExceptionPeriod,
  groupExceptions,
  periodLength,
} from "./exceptions";
import { type Interval, intervalsLabel, mergeIntervals } from "./hours";

export type ParamKey = "step" | "notice" | "horizon" | "deadline";

export type ScheduleData = {
  timeZone: string;
  template: Schedule["template"];
  exceptionDays: ExceptionDay[];
  appointments: UpcomingAppointment[];
  params: Record<ParamKey, number>;
  autoConfirm: boolean;
};

export type ScheduleView = {
  today: string;
  zone: string;
  schedule: Schedule;
  appointments: LocalAppointment[];
  days: {
    weekday: number;
    name: string;
    short: string;
    hours: Interval[];
    label: string | null;
  }[];
  periods: (ExceptionPeriod & {
    dates: string;
    length: number;
    outsideCount: number;
  })[];
  templateEmpty: boolean;
  params: { key: ParamKey; value: number; label: string | null }[];
  autoConfirm: boolean;
};

const paramKeys: ParamKey[] = ["step", "notice", "horizon", "deadline"];

const paramLists: Record<ParamKey, number[]> = {
  step: [5, 10, 15, 20, 30, 60],
  notice: [0, 30, 60, 120, 180, 360, 720, 1440, 2880, 4320, 10080],
  horizon: [7, 14, 30, 60, 90, 180, 365],
  deadline: [0, 60, 120, 360, 720, 1440, 2880, 4320, 10080],
};

// A value set outside the list, for example by an agent, stays selectable.
export function paramOptions(key: ParamKey, current: number): number[] {
  const options = paramLists[key];
  return (options.includes(current) ? options : [...options, current]).sort(
    (a, b) => a - b,
  );
}

function days(count: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "day",
    unitDisplay: "long",
  }).format(count);
}

// Zero has no number text: it is "right away" or "any time" from the messages.
export function paramLabel(
  key: ParamKey,
  value: number,
  locale: Locale,
): string | null {
  if (value === 0) return null;
  if (key === "horizon") return days(value, locale);
  return value % 1440 === 0
    ? days(value / 1440, locale)
    : formatDuration(value, locale);
}

function capitalize(text: string, locale: Locale): string {
  return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}

function weekdayName(
  weekday: number,
  style: "long" | "short",
  locale: Locale,
): string {
  // 2024-01-01 is a Monday.
  const noon = new Date(`${addDays("2024-01-01", weekday - 1)}T12:00:00Z`);
  return capitalize(
    new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: style }).format(
      noon,
    ),
    locale,
  );
}

function datesLabel(from: string, to: string, locale: Locale): string {
  const format = new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  });
  const start = new Date(`${from}T12:00:00Z`);
  return from === to
    ? format.format(start)
    : format.formatRange(start, new Date(`${to}T12:00:00Z`));
}

export function appointmentLine(
  appointment: LocalAppointment,
  locale: Locale,
): string {
  const when = `${datesLabel(appointment.date, appointment.date, locale)}, ${appointment.startLabel}–${appointment.endLabel}`;
  return appointment.clientName ? `${when} · ${appointment.clientName}` : when;
}

export function toScheduleView(
  data: ScheduleData,
  locale: Locale,
  now: Date,
): ScheduleView {
  const today = localDate(now, data.timeZone);
  const schedule: Schedule = {
    template: data.template,
    exceptions: data.exceptionDays,
  };
  const appointments = data.appointments.map((row) =>
    toLocalAppointment(row, data.timeZone),
  );
  const weekdays = [1, 2, 3, 4, 5, 6, 7];
  return {
    today,
    zone: zoneLabel(data.timeZone, locale),
    schedule,
    appointments,
    days: weekdays.map((weekday) => {
      const hours = mergeIntervals(data.template[weekday] ?? []);
      return {
        weekday,
        name: weekdayName(weekday, "long", locale),
        short: weekdayName(weekday, "short", locale),
        hours,
        label: hours.length > 0 ? intervalsLabel(hours) : null,
      };
    }),
    periods: groupExceptions(data.exceptionDays, today).map((period) => ({
      ...period,
      dates: datesLabel(period.from, period.to, locale),
      length: periodLength(period.from, period.to),
      outsideCount: outsideInPeriod(appointments, period).length,
    })),
    templateEmpty: weekdays.every(
      (weekday) => (data.template[weekday] ?? []).length === 0,
    ),
    params: paramKeys.map((key) => ({
      key,
      value: data.params[key],
      label: paramLabel(key, data.params[key], locale),
    })),
    autoConfirm: data.autoConfirm,
  };
}
