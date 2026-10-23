import type { Locale } from "@/i18n/locales";

// Dates are master-local calendar days as "YYYY-MM-DD"; slots are ISO instants.

export function localDate(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function addDays(date: string, days: number): string {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function horizonDates(today: string, horizonDays: number): string[] {
  return Array.from({ length: horizonDays + 1 }, (_, i) => addDays(today, i));
}

// The availability functions take at most 62 days per request.
export function dayRanges(dates: string[], size = 62): [string, string][] {
  const ranges: [string, string][] = [];
  for (let i = 0; i < dates.length; i += size) {
    const chunk = dates.slice(i, i + size);
    ranges.push([chunk[0], chunk[chunk.length - 1]]);
  }
  return ranges;
}

export type SlotPeriod = "morning" | "day" | "evening";

export type SlotGroup = {
  period: SlotPeriod;
  slots: { value: string; label: string }[];
};

export function groupSlots(
  slots: string[],
  timeZone: string,
  locale: Locale,
): SlotGroup[] {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  });
  const time = new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  });
  const groups: SlotGroup[] = [
    { period: "morning", slots: [] },
    { period: "day", slots: [] },
    { period: "evening", slots: [] },
  ];
  for (const value of slots) {
    const instant = new Date(value);
    const h = Number(hour.format(instant));
    const group = h < 12 ? groups[0] : h < 17 ? groups[1] : groups[2];
    group.slots.push({ value, label: time.format(instant) });
  }
  return groups.filter((group) => group.slots.length > 0);
}

export function dayLabel(date: string, locale: Locale) {
  const noon = new Date(`${date}T12:00:00Z`);
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...options }).format(
      noon,
    );
  return {
    weekday: format({ weekday: "short" }),
    day: format({ day: "numeric" }),
    month: format({ month: "long" }),
    full: format({ weekday: "long", day: "numeric", month: "long" }),
  };
}

export function slotDateTimeLabel(
  slot: string,
  timeZone: string,
  locale: Locale,
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(slot));
}

export function slotTimeLabel(
  slot: string,
  timeZone: string,
  locale: Locale,
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(slot));
}

export function nearbySlots(slots: string[], taken: string): string[] {
  const at = new Date(taken).getTime();
  const before = slots.filter((slot) => new Date(slot).getTime() < at).at(-1);
  const after = slots.find((slot) => new Date(slot).getTime() > at);
  return [before, after].filter((slot) => slot !== undefined);
}

export function cancelDeadline(
  slot: string,
  deadlineMinutes: number,
  now: Date,
): string | null {
  const deadline = new Date(
    new Date(slot).getTime() - deadlineMinutes * 60_000,
  );
  return deadline > now ? deadline.toISOString() : null;
}

export function zoneLabel(timeZone: string, locale: Locale): string {
  return (
    new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: "longGeneric" })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value ?? timeZone
  );
}
