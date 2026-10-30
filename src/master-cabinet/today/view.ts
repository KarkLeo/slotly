import { addDays, dayLabel, localDate, slotTimeLabel } from "@/booking/dates";
import type { Locale } from "@/i18n/locales";
import { formatDuration } from "@/landing/format";
import { localize } from "@/landing/localize";
import type { AgendaItem } from "./agenda";
import type { TodayData } from "./load";

export type Badge =
  "awaitingMaster" | "confirmed" | "now" | "completed" | "noShow";

export type RelativeDay = {
  day: "today" | "tomorrow" | "later";
  date: string;
  time: string;
};

export type RowView =
  | {
      kind: "appointment";
      id: string;
      time: string;
      clientName: string;
      detail: string;
      badge: Badge;
      muted: boolean;
    }
  | { kind: "block"; id: string; time: string | null; note: string | null };

export type AwaitingView = {
  id: string;
  clientName: string;
  service: string;
  when: RelativeDay;
  answerBy: RelativeDay;
};

export type TodayView = {
  date: string;
  counts: { today: number; tomorrow: number; awaiting: number };
  awaiting: AwaitingView[];
  today: RowView[];
  tomorrow: RowView[];
};

function badgeOf(
  item: Extract<AgendaItem, { kind: "appointment" }>,
  now: Date,
): Badge {
  if (item.status === "pending") return "awaitingMaster";
  if (item.status === "no_show") return "noShow";
  if (item.status === "completed") return "completed";
  if (new Date(item.endsAt) <= now) return "completed";
  if (new Date(item.startsAt) <= now) return "now";
  return "confirmed";
}

export function toTodayView(
  data: TodayData,
  locale: Locale,
  now: Date,
): TodayView {
  const { timeZone, primaryLocale, today } = data;
  const tomorrow = addDays(today, 1);
  const time = (instant: string) => slotTimeLabel(instant, timeZone, locale);

  const relative = (instant: string): RelativeDay => {
    const date = localDate(new Date(instant), timeZone);
    const day =
      date === today ? "today" : date === tomorrow ? "tomorrow" : "later";
    return {
      day,
      date: day === "later" ? dayLabel(date, locale).full : "",
      time: time(instant),
    };
  };

  const row = (item: AgendaItem): RowView => {
    if (item.kind === "block") {
      return {
        kind: "block",
        id: item.id,
        time: item.allDay
          ? null
          : `${time(item.startsAt)}–${time(item.endsAt)}`,
        note: item.note,
      };
    }
    const badge = badgeOf(item, now);
    const minutes =
      (new Date(item.endsAt).getTime() - new Date(item.startsAt).getTime()) /
      60_000;
    return {
      kind: "appointment",
      id: item.id,
      time: time(item.startsAt),
      clientName: item.clientName,
      detail: `${localize(item.serviceName, locale, primaryLocale)} · ${formatDuration(minutes, locale)}`,
      badge,
      muted: badge === "completed" || badge === "noShow",
    };
  };

  const onDay = (day: string) => data.agenda.filter((item) => item.day === day);
  const appointments = (items: AgendaItem[]) =>
    items.filter((item) => item.kind === "appointment").length;

  const todayItems = onDay(today);
  const tomorrowItems = onDay(tomorrow);

  return {
    date: dayLabel(today, locale).full,
    counts: {
      today: appointments(todayItems),
      tomorrow: appointments(tomorrowItems),
      awaiting: data.awaiting.length,
    },
    awaiting: data.awaiting.map((a) => ({
      id: a.id,
      clientName: a.clientName,
      service: localize(a.serviceName, locale, primaryLocale),
      when: relative(a.startsAt),
      answerBy: relative(a.holdUntil),
    })),
    today: todayItems.map(row),
    tomorrow: tomorrowItems.map(row),
  };
}
