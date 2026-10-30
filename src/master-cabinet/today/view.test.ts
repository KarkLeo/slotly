import { describe, expect, it } from "vitest";
import { formatDuration } from "@/landing/format";
import type { AgendaItem, AwaitingDecision } from "./agenda";
import type { TodayData } from "./load";
import { toTodayView } from "./view";

// 2026-10-30 is a Friday; Kyiv is UTC+2 after the 25 October change.
const now = new Date("2026-10-30T10:00:00Z");

function appt(
  id: string,
  day: string,
  start: string,
  end: string,
  status: Extract<AgendaItem, { kind: "appointment" }>["status"] = "confirmed",
  extra: Partial<Extract<AgendaItem, { kind: "appointment" }>> = {},
): AgendaItem {
  return {
    kind: "appointment",
    id,
    day,
    startsAt: start,
    endsAt: end,
    status,
    holdUntil: null,
    clientName: `Client ${id}`,
    serviceName: { uk: "Манікюр", en: "Manicure" },
    ...extra,
  };
}

function awaiting(
  id: string,
  startsAt: string,
  holdUntil: string,
): AwaitingDecision {
  return {
    id,
    startsAt,
    endsAt: new Date(new Date(startsAt).getTime() + 3_600_000).toISOString(),
    holdUntil,
    clientName: `Client ${id}`,
    serviceName: { uk: "Манікюр" },
  };
}

const data: TodayData = {
  timeZone: "Europe/Kyiv",
  primaryLocale: "uk",
  agenda: [
    appt("done", "2026-10-30", "2026-10-30T06:00:00Z", "2026-10-30T07:00:00Z"),
    appt("live", "2026-10-30", "2026-10-30T09:30:00Z", "2026-10-30T10:30:00Z"),
    appt("later", "2026-10-30", "2026-10-30T12:00:00Z", "2026-10-30T13:30:00Z"),
    appt(
      "p-today",
      "2026-10-30",
      "2026-10-30T14:00:00Z",
      "2026-10-30T15:00:00Z",
      "pending",
      {
        holdUntil: "2026-10-30T16:20:00Z",
      },
    ),
    appt(
      "miss",
      "2026-10-30",
      "2026-10-30T05:00:00Z",
      "2026-10-30T06:00:00Z",
      "no_show",
    ),
    {
      kind: "block",
      id: "b-today",
      day: "2026-10-30",
      startsAt: "2026-10-30T15:00:00Z",
      endsAt: "2026-10-30T16:00:00Z",
      allDay: false,
      note: "Lunch",
    },
    appt("t1", "2026-10-31", "2026-10-31T08:00:00Z", "2026-10-31T09:00:00Z"),
    {
      kind: "block",
      id: "b-tomorrow",
      day: "2026-10-31",
      startsAt: "2026-10-30T22:00:00Z",
      endsAt: "2026-10-31T22:00:00Z",
      allDay: true,
      note: null,
    },
  ],
  awaiting: [
    awaiting("p-today", "2026-10-30T14:00:00Z", "2026-10-30T16:20:00Z"),
    awaiting("p-week", "2026-11-06T09:00:00Z", "2026-11-02T09:00:00Z"),
  ],
};

describe("toTodayView", () => {
  it("derives the status from the database status and time", () => {
    const view = toTodayView(data, "uk", now);
    const row = (id: string) => view.today.find((r) => r.id === id);
    expect(row("done")).toMatchObject({ status: "completed", finished: true });
    expect(row("live")).toMatchObject({ status: "now", finished: false });
    expect(row("later")).toMatchObject({
      status: "confirmed",
      finished: false,
    });
    expect(row("p-today")).toMatchObject({
      status: "awaitingMaster",
      finished: false,
    });
    expect(row("miss")).toMatchObject({ status: "noShow", finished: true });
  });

  it("gives the service and the duration of an appointment apart", () => {
    const view = toTodayView(data, "uk", now);
    expect(view.today.find((r) => r.id === "later")).toMatchObject({
      service: "Манікюр",
      duration: formatDuration(90, "uk"),
    });
  });

  it("is empty only without a queue and without anything on both days", () => {
    expect(toTodayView(data, "uk", now).empty).toBe(false);
    const nothing = { ...data, agenda: [], awaiting: [] };
    expect(toTodayView(nothing, "uk", now).empty).toBe(true);
    const queueOnly = { ...data, agenda: [] };
    expect(toTodayView(queueOnly, "uk", now).empty).toBe(false);
    const blockOnly = {
      ...data,
      agenda: data.agenda.slice(5, 6),
      awaiting: [],
    };
    expect(toTodayView(blockOnly, "uk", now).empty).toBe(false);
  });

  it("counts appointments per day, not blocks", () => {
    expect(toTodayView(data, "uk", now).counts).toEqual({
      today: 5,
      tomorrow: 1,
      awaiting: 2,
    });
  });

  it("keeps a pending appointment a week ahead only in the queue", () => {
    const view = toTodayView(data, "uk", now);
    expect(view.awaiting.map((a) => a.id)).toContain("p-week");
    expect([...view.today, ...view.tomorrow].map((r) => r.id)).not.toContain(
      "p-week",
    );
  });

  it("labels answer-by relative to the master's today", () => {
    const view = toTodayView(data, "uk", now);
    expect(view.awaiting[0].answerBy).toEqual({
      day: "today",
      date: "",
      time: "18:20",
    });
    expect(view.awaiting[1].answerBy.day).toBe("later");
    expect(view.awaiting[1].when).toEqual({
      day: "later",
      date: "пʼятниця, 6 листопада",
      time: "11:00",
    });
  });

  it("labels tomorrow", () => {
    const view = toTodayView(
      {
        ...data,
        awaiting: [
          awaiting("x", "2026-10-31T08:00:00Z", "2026-10-31T06:00:00Z"),
        ],
      },
      "uk",
      now,
    );
    expect(view.awaiting[0].when.day).toBe("tomorrow");
  });

  it("uses the master's date, not UTC, for a New York master", () => {
    // Already 31 October in UTC, still 30 October in New York.
    const ny = new Date("2026-10-31T02:30:00Z");
    const view = toTodayView(
      {
        ...data,
        timeZone: "America/New_York",
        primaryLocale: "en",
        agenda: [],
        awaiting: [
          awaiting("n", "2026-10-30T23:00:00Z", "2026-10-31T01:00:00Z"),
        ],
      },
      "en",
      ny,
    );
    expect(view.date).toBe("Friday, October 30");
    expect(view.awaiting[0].when).toMatchObject({
      day: "today",
      time: "07:00 PM",
    });
    expect(view.awaiting[0].answerBy).toMatchObject({ day: "today" });
  });

  it("localizes the service name with the master's primary locale as fallback", () => {
    const view = toTodayView(
      {
        ...data,
        agenda: [
          appt(
            "u",
            "2026-10-30",
            "2026-10-30T12:00:00Z",
            "2026-10-30T13:00:00Z",
            "confirmed",
            {
              serviceName: { uk: "Манікюр" },
            },
          ),
        ],
      },
      "en",
      now,
    );
    expect(view.today[0]).toMatchObject({ service: "Манікюр" });
  });

  it("shows no time for an all-day block and a range for a timed one", () => {
    const view = toTodayView(data, "uk", now);
    expect(view.tomorrow.find((r) => r.kind === "block")).toMatchObject({
      time: null,
    });
    expect(view.today.find((r) => r.id === "b-today")).toMatchObject({
      time: "17:00–18:00",
    });
  });

  it("keeps the SQL order and capitalizes the header date in the locale", () => {
    const view = toTodayView(data, "uk", now);
    expect(view.today.map((r) => r.id)).toEqual([
      "done",
      "live",
      "later",
      "p-today",
      "miss",
      "b-today",
    ]);
    expect(view.date).toBe("Пʼятниця, 30 жовтня");
    expect(toTodayView(data, "ru", now).date).toBe("Пятница, 30 октября");
  });
});
