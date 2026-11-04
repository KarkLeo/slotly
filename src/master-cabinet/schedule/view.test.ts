import { describe, expect, it } from "vitest";
import type { UpcomingAppointment } from "./conflicts";
import {
  appointmentLine,
  paramLabel,
  paramOptions,
  type ScheduleData,
  toScheduleView,
} from "./view";

const base: ScheduleData = {
  timeZone: "Europe/Kyiv",
  template: { 1: [{ start: 600, end: 1140 }] },
  exceptionDays: [],
  appointments: [],
  params: { step: 30, notice: 60, horizon: 30, deadline: 0 },
  autoConfirm: false,
};
const now = new Date("2026-11-04T23:30:00Z");
const view = (patch: Partial<ScheduleData> = {}) =>
  toScheduleView({ ...base, ...patch }, "uk", now);

describe("paramOptions", () => {
  it("lists the standard values", () => {
    expect(paramOptions("step", 15)).toEqual([5, 10, 15, 20, 30, 60]);
  });

  it("keeps an off-list value in order", () => {
    const options = paramOptions("notice", 45);
    expect(options).toContain(45);
    expect(options).toEqual([...options].sort((a, b) => a - b));
  });
});

describe("paramLabel", () => {
  it("is null for zero", () => {
    expect(paramLabel("deadline", 0, "uk")).toBeNull();
  });

  it("formats whole days as days", () => {
    expect(paramLabel("notice", 1440, "uk")).toBe("1 день");
    expect(paramLabel("horizon", 30, "uk")).toBe("30 днів");
  });

  it("formats other minutes as a duration", () => {
    expect(paramLabel("step", 60, "uk")).toMatch(/^1\s?г/);
    expect(paramLabel("notice", 45, "uk")).toMatch(/45/);
  });
});

describe("toScheduleView", () => {
  it("counts today in the master's zone", () => {
    expect(view().today).toBe("2026-11-05");
  });

  it("names the zone by its city, as the settings row does", () => {
    expect(view().zone).toBe("Kyiv");
  });

  it("gives seven days with a null label for a day off", () => {
    const { days } = view();
    expect(days.map((d) => d.weekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(days[0]).toMatchObject({ name: "Понеділок", label: "10:00–19:00" });
    expect(days[1].label).toBeNull();
  });

  it("ignores exceptions when judging an empty template", () => {
    const result = view({
      template: {},
      exceptionDays: [{ day: "2026-11-10", hours: [{ start: 600, end: 700 }] }],
    });
    expect(result.templateEmpty).toBe(true);
    expect(view().templateEmpty).toBe(false);
  });

  it("counts appointments outside each period", () => {
    const row = (id: string, startsAt: string): UpcomingAppointment => ({
      id,
      clientName: null,
      startsAt,
      endsAt: new Date(new Date(startsAt).getTime() + 3600_000).toISOString(),
    });
    const result = view({
      exceptionDays: [
        { day: "2026-11-10", hours: [] },
        { day: "2026-11-11", hours: [] },
        { day: "2026-11-20", hours: [{ start: 600, end: 840 }] },
      ],
      appointments: [
        row("a", "2026-11-10T10:00:00Z"),
        row("b", "2026-11-11T10:00:00Z"),
        row("c", "2026-11-20T08:00:00Z"),
        row("d", "2026-11-20T12:00:00Z"),
        row("e", "2026-11-25T10:00:00Z"),
      ],
    });
    expect(result.periods.map((p) => [p.from, p.to, p.length])).toEqual([
      ["2026-11-10", "2026-11-11", 2],
      ["2026-11-20", "2026-11-20", 1],
    ]);
    expect(result.periods.map((p) => p.outsideCount)).toEqual([2, 1]);
  });

  it("lists the four parameters in order", () => {
    expect(view().params.map((p) => p.key)).toEqual([
      "step",
      "notice",
      "horizon",
      "deadline",
    ]);
  });
});

describe("appointmentLine", () => {
  const appointment = {
    id: "a",
    clientName: "Olha",
    date: "2026-11-10",
    startLabel: "13:00",
    endLabel: "14:00",
    parts: [],
  };

  it("joins the client name with a separator", () => {
    expect(appointmentLine(appointment, "en")).toBe(
      "Nov 10, 13:00–14:00 · Olha",
    );
  });

  it("omits the separator without a client name", () => {
    expect(appointmentLine({ ...appointment, clientName: null }, "en")).toBe(
      "Nov 10, 13:00–14:00",
    );
  });
});
