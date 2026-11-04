import { createTranslator } from "next-intl";
import { within } from "storybook/test";
import type { Locale } from "@/i18n/locales";
import { dictionaries, localeOf } from "../settings/story-settings";
import { type ScheduleView, type ScheduleData, toScheduleView } from "./view";

export { dictionaries, localeOf };

// A fixed instant keeps "today" and the zone offsets the same whenever the stories run.
const now = new Date("2026-11-04T12:00:00Z");

const week = {
  1: [
    { start: 600, end: 840 },
    { start: 900, end: 1140 },
  ],
  2: [{ start: 600, end: 1140 }],
  3: [{ start: 600, end: 1140 }],
  4: [{ start: 600, end: 1140 }],
  5: [{ start: 600, end: 1140 }],
  6: [{ start: 600, end: 900 }],
};

const off = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };

// Kyiv is UTC+2 in November, so 12:00 local is 10:00Z.
const appointments = [
  {
    id: "marta",
    clientName: "Марта",
    startsAt: "2026-11-09T10:00:00Z",
    endsAt: "2026-11-09T11:30:00Z",
  },
  {
    id: "olena",
    clientName: "Олена",
    startsAt: "2026-11-16T14:00:00Z",
    endsAt: "2026-11-16T15:30:00Z",
  },
  {
    id: "iryna",
    clientName: "Ірина",
    startsAt: "2026-11-26T09:00:00Z",
    endsAt: "2026-11-26T10:00:00Z",
  },
  {
    id: "sofia",
    clientName: "Софія",
    startsAt: "2026-12-01T13:00:00Z",
    endsAt: "2026-12-01T14:30:00Z",
  },
  {
    id: "marichka",
    clientName: "Марічка",
    startsAt: "2026-12-05T14:00:00Z",
    endsAt: "2026-12-05T15:00:00Z",
  },
];

const filled: ScheduleData = {
  timeZone: "Europe/Kyiv",
  template: week,
  exceptionDays: [
    { day: "2026-11-13", hours: [] },
    ...[
      "2026-11-25",
      "2026-11-26",
      "2026-11-27",
      "2026-11-28",
      "2026-11-29",
      "2026-11-30",
      "2026-12-01",
      "2026-12-02",
    ].map((day) => ({ day, hours: [] })),
    { day: "2026-12-24", hours: [{ start: 600, end: 840 }] },
  ],
  appointments,
  params: { step: 15, notice: 120, horizon: 30, deadline: 720 },
  autoConfirm: true,
};

const kateryna = {
  id: "kateryna",
  clientName: "Катерина",
  startsAt: "2026-11-29T09:00:00Z",
  endsAt: "2026-11-29T10:00:00Z",
};

export const scheduleStories = {
  filled,
  noExceptions: { ...filled, exceptionDays: [] },
  // Sunday 29 Nov is a day off in the template, so shortening the vacation releases it to a day off with an appointment.
  releasedDay: { ...filled, appointments: [...appointments, kateryna] },
  // Special hours on Saturday 5 Dec cover the 16:00 appointment that the template does not.
  widerHours: {
    ...filled,
    exceptionDays: [{ day: "2026-12-05", hours: [{ start: 600, end: 1200 }] }],
  },
  emptyTemplate: { ...filled, template: off },
  // 09:10 is off the 15-minute grid, as if an agent had saved it.
  offGrid: {
    ...filled,
    template: { ...week, 1: [{ start: 550, end: 840 }] },
  },
  // 45 minutes is off the notice list, as if an agent had saved it.
  offListParam: { ...filled, params: { ...filled.params, notice: 45 } },
  zeroParams: {
    ...filled,
    params: { ...filled.params, notice: 0, deadline: 0 },
  },
  autoConfirmOff: { ...filled, autoConfirm: false },
  threeIntervals: {
    ...filled,
    template: {
      ...week,
      1: [
        { start: 600, end: 720 },
        { start: 780, end: 900 },
        { start: 960, end: 1140 },
      ],
    },
  },
} satisfies Record<string, ScheduleData>;

export function scheduleView(data: ScheduleData, locale: Locale): ScheduleView {
  return toScheduleView(data, locale, now);
}

export const scheduleTextsOf = (locale: unknown) =>
  dictionaries[localeOf(locale)].MasterCabinet;

export const scheduleFormatterOf = (locale: unknown) =>
  createTranslator({
    locale: localeOf(locale),
    messages: dictionaries[localeOf(locale)],
    namespace: "MasterCabinet.schedule",
  });

export const dayRow = (canvas: HTMLElement, name: string) =>
  within(canvas).getByRole("button", { name: new RegExp(`^${name}`) });

export const toastsOf = (locale: unknown) =>
  dictionaries[localeOf(locale)].Toasts;

export const exceptionRow = (canvas: HTMLElement, dates: string) =>
  within(canvas).getByRole("button", {
    name: (name) => name.startsWith(dates),
  });

export const paramRow = (canvas: HTMLElement, label: string) =>
  within(canvas).getByRole("button", {
    name: (name) => name.startsWith(label),
  });
