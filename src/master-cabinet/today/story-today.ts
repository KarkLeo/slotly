import { addDays, localDate } from "@/booking/dates";
import type { Locale } from "@/i18n/locales";
import type { LocalizedText } from "@/landing/localize";
import type { AgendaItem, AwaitingDecision } from "./agenda";
import type { TodayData } from "./load";
import { type TodayView, toTodayView } from "./view";

const hour = 3_600_000;
const timeZone = "Europe/Kyiv";

// Whole hours from the start of the current hour, so the stories show the same states whenever they run.
function fromNow(hours: number): string {
  const instant = new Date();
  instant.setUTCMinutes(0, 0, 0);
  return new Date(instant.getTime() + hours * hour).toISOString();
}

const today = localDate(new Date(), timeZone);
const tomorrow = addDays(today, 1);

const manicure = {
  uk: "Манікюр з покриттям",
  ru: "Маникюр с покрытием",
  en: "Gel manicure",
};
const pedicure = { uk: "Педикюр", ru: "Педикюр", en: "Pedicure" };
const correction = {
  uk: "Корекція нігтів",
  ru: "Коррекция ногтей",
  en: "Nail correction",
};

function appointment(
  id: string,
  day: string,
  startsIn: number,
  hours: number,
  clientName: string,
  serviceName: LocalizedText,
  status: Extract<AgendaItem, { kind: "appointment" }>["status"] = "confirmed",
): AgendaItem {
  return {
    kind: "appointment",
    id,
    day,
    startsAt: fromNow(startsIn),
    endsAt: fromNow(startsIn + hours),
    status,
    holdUntil: status === "pending" ? fromNow(3) : null,
    clientName,
    serviceName,
  };
}

function block(
  id: string,
  day: string,
  startsIn: number,
  hours: number,
  note: string | null,
  allDay = false,
): AgendaItem {
  return {
    kind: "block",
    id,
    day,
    startsAt: fromNow(startsIn),
    endsAt: fromNow(startsIn + hours),
    allDay,
    note,
  };
}

function awaiting(
  id: string,
  startsIn: number,
  clientName: string,
  serviceName: LocalizedText,
): AwaitingDecision {
  return {
    id,
    startsAt: fromNow(startsIn),
    endsAt: fromNow(startsIn + 1.5),
    holdUntil: fromNow(3),
    clientName,
    serviceName,
  };
}

function data(
  agenda: AgendaItem[],
  awaitingDecisions: AwaitingDecision[],
): TodayData {
  return {
    timeZone,
    primaryLocale: "uk",
    agenda,
    awaiting: awaitingDecisions,
  };
}

const todayAgenda = [
  appointment("a1", today, -5, 1, "Ірина Бондар", manicure, "no_show"),
  appointment("a2", today, -3, 1, "Оксана Ткачук", correction, "completed"),
  appointment("a3", today, 0, 1.5, "Марта Шевчук", pedicure),
  block("k1", today, 2, 0.5, "Обід"),
  appointment("a4", today, 3, 0.75, "Софія Литвин", correction),
];

// 60 characters each, the longest names the screen must wrap at 360 px.
const longClient =
  "Анастасия-Александра Преображенская-Воскресенская-Милославна";
const longService = {
  uk: "Комплексний догляд: манікюр, педикюр, парафінотерапія, масаж",
  ru: "Комплексный уход: маникюр, педикюр, парафинотерапия и массаж",
  en: "Complete care: manicure, pedicure, paraffin therapy, massage",
};

export const longNames = { client: longClient, service: longService };

export const stories = {
  full: data(
    [
      ...todayAgenda,
      appointment(
        "a5",
        tomorrow,
        24,
        1.5,
        "Олена Кравець",
        manicure,
        "pending",
      ),
      appointment("a6", tomorrow, 27, 1.5, "Дарина Коваль", manicure),
    ],
    [awaiting("a5", 24, "Олена Кравець", manicure)],
  ),
  // A pending appointment five days ahead is in the queue but in no feed.
  queueOnly: data([], [awaiting("a7", 120, "Олена Кравець", manicure)]),
  noQueue: data(
    [...todayAgenda, block("k2", tomorrow, 24, 24, null, true)],
    [],
  ),
  empty: data([], []),
  longNames: data(
    [appointment("a8", today, 1, 1.5, longClient, longService)],
    [awaiting("a9", 25, longClient, longService)],
  ),
};

export function todayView(data: TodayData, locale: Locale): TodayView {
  return toTodayView(data, locale, new Date());
}
