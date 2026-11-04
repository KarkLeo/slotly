import { describe, expect, it } from "vitest";
import {
  isoWeekday,
  type LocalAppointment,
  outsideAfterExceptionChange,
  outsideAfterExceptionDelete,
  outsideAfterTemplateChange,
  outsideInPeriod,
  type Schedule,
  toLocalAppointment,
} from "./conflicts";

const zone = "Europe/Kyiv";
// Kyiv is UTC+2 in winter.
const at = (date: string, time: string, length = 60) => {
  const start = new Date(`${date}T${time}:00+02:00`);
  return toLocalAppointment(
    {
      id: `${date}T${time}`,
      clientName: "Olha",
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + length * 60_000).toISOString(),
    },
    zone,
  );
};
const hours = (start: number, end: number) => [{ start, end }];
const empty: Schedule = { template: {}, exceptions: [] };
const ids = (list: LocalAppointment[]) => list.map((a) => a.id);

describe("toLocalAppointment", () => {
  it("splits an appointment that crosses midnight", () => {
    expect(at("2026-11-09", "23:00", 120).parts).toEqual([
      { date: "2026-11-09", start: 1380, end: 1440 },
      { date: "2026-11-10", start: 0, end: 60 },
    ]);
  });

  it("keeps one part when it ends exactly at midnight", () => {
    const appointment = at("2026-11-09", "22:00", 120);
    expect(appointment.parts).toEqual([
      { date: "2026-11-09", start: 1320, end: 1440 },
    ]);
    expect(appointment.startLabel).toBe("22:00");
    expect(appointment.endLabel).toBe("00:00");
  });

  it("uses the master's zone for the date", () => {
    const row = {
      id: "x",
      clientName: null,
      startsAt: "2026-11-04T23:30:00Z",
      endsAt: "2026-11-05T00:30:00Z",
    };
    expect(toLocalAppointment(row, zone).date).toBe("2026-11-05");
  });
});

describe("isoWeekday", () => {
  it("numbers Monday 1 and Sunday 7", () => {
    expect(isoWeekday("2026-11-09")).toBe(1);
    expect(isoWeekday("2026-11-15")).toBe(7);
  });
});

describe("outsideAfterTemplateChange", () => {
  it("lists an appointment left outside the new hours", () => {
    const list = [at("2026-11-09", "13:00"), at("2026-11-09", "10:30")];
    expect(
      ids(outsideAfterTemplateChange(list, empty, [1], hours(600, 720))),
    ).toEqual(["2026-11-09T13:00"]);
  });

  it("skips weekdays that are not changed", () => {
    const list = [at("2026-11-10", "13:00")];
    expect(outsideAfterTemplateChange(list, empty, [1], [])).toEqual([]);
  });

  it("skips a date with an exception", () => {
    const schedule: Schedule = {
      template: {},
      exceptions: [{ day: "2026-11-09", hours: hours(600, 1140) }],
    };
    const list = [at("2026-11-09", "13:00")];
    expect(outsideAfterTemplateChange(list, schedule, [1], [])).toEqual([]);
  });

  it("does not flag adjacent intervals", () => {
    const list = [at("2026-11-09", "13:00", 120)];
    const adjacent = [
      { start: 600, end: 840 },
      { start: 840, end: 1140 },
    ];
    expect(outsideAfterTemplateChange(list, empty, [1], adjacent)).toEqual([]);
  });

  it("flags the next day's part when that day is changed too", () => {
    const list = [at("2026-11-09", "23:00", 120)];
    expect(
      ids(outsideAfterTemplateChange(list, empty, [1, 2], hours(1320, 1440))),
    ).toEqual(["2026-11-09T23:00"]);
  });

  it("does not flag an appointment ending at midnight when the next day is off", () => {
    const list = [at("2026-11-09", "22:00", 120)];
    expect(
      outsideAfterTemplateChange(list, empty, [1, 2], hours(1320, 1440)),
    ).toEqual([]);
  });

  it("flags an appointment whose part on an unchanged day is outside", () => {
    const list = [at("2026-11-09", "23:00", 120)];
    expect(
      ids(outsideAfterTemplateChange(list, empty, [1], hours(1320, 1440))),
    ).toEqual(["2026-11-09T23:00"]);
  });

  it("does not flag a night that the unchanged next day still covers", () => {
    const schedule: Schedule = {
      template: { 2: hours(0, 120) },
      exceptions: [],
    };
    const list = [at("2026-11-09", "23:00", 120)];
    expect(
      outsideAfterTemplateChange(list, schedule, [1], hours(1320, 1440)),
    ).toEqual([]);
  });

  it("uses the exception of an unchanged day", () => {
    const schedule: Schedule = {
      template: {},
      exceptions: [{ day: "2026-11-10", hours: hours(0, 120) }],
    };
    const list = [at("2026-11-09", "23:00", 120)];
    expect(
      outsideAfterTemplateChange(list, schedule, [1], hours(1320, 1440)),
    ).toEqual([]);
  });
});

describe("outsideAfterExceptionChange", () => {
  const schedule: Schedule = {
    template: { 6: hours(600, 1140), 7: hours(600, 1140), 1: hours(600, 1140) },
    exceptions: [],
  };

  it("checks days dropped from a shortened period against the template", () => {
    const replaced = { from: "2026-11-25", to: "2026-12-02", hours: [] };
    // The template is open only on Mon, Sat and Sun.
    const list = [at("2026-11-26", "12:00"), at("2026-11-29", "12:00")];
    const result = outsideAfterExceptionChange(list, schedule, {
      from: "2026-11-25",
      to: "2026-11-28",
      hours: [],
      replaced,
    });
    expect(ids(result)).toEqual(["2026-11-26T12:00"]);
    const dropped = outsideAfterExceptionChange(
      [at("2026-11-30", "12:00"), at("2026-12-01", "12:00")],
      schedule,
      { from: "2026-11-25", to: "2026-11-28", hours: [], replaced },
    );
    expect(ids(dropped)).toEqual(["2026-12-01T12:00"]);
  });

  it("ignores days outside the range and the old period", () => {
    const list = [at("2026-12-10", "12:00")];
    expect(
      outsideAfterExceptionChange(list, schedule, {
        from: "2026-11-25",
        to: "2026-11-28",
        hours: [],
        replaced: null,
      }),
    ).toEqual([]);
  });
});

describe("outsideAfterExceptionDelete", () => {
  it("uses the template for the period's days", () => {
    const schedule: Schedule = {
      template: { 1: hours(480, 1320) },
      exceptions: [],
    };
    const period = { from: "2026-11-09", to: "2026-11-10", hours: [] };
    const list = [at("2026-11-09", "20:00"), at("2026-11-10", "10:00")];
    expect(ids(outsideAfterExceptionDelete(list, schedule, period))).toEqual([
      "2026-11-10T10:00",
    ]);
  });
});

describe("a night split across two days", () => {
  const list = [at("2026-11-09", "23:00", 120)];
  const period = { from: "2026-11-09", to: "2026-11-10", hours: [] };

  it("is inside 22:00-24:00 plus 00:00-02:00", () => {
    const schedule: Schedule = {
      template: { 1: hours(1320, 1440), 2: hours(0, 120) },
      exceptions: [],
    };
    expect(outsideAfterExceptionDelete(list, schedule, period)).toEqual([]);
  });

  it("is outside when the next day is off", () => {
    const schedule: Schedule = {
      template: { 1: hours(1320, 1440) },
      exceptions: [],
    };
    expect(ids(outsideAfterExceptionDelete(list, schedule, period))).toEqual([
      "2026-11-09T23:00",
    ]);
  });
});

describe("outsideInPeriod", () => {
  it("uses the period's own hours", () => {
    const period = {
      from: "2026-11-09",
      to: "2026-11-10",
      hours: hours(600, 840),
    };
    const list = [at("2026-11-09", "11:00"), at("2026-11-10", "15:00")];
    expect(ids(outsideInPeriod(list, empty, period))).toEqual([
      "2026-11-10T15:00",
    ]);
  });
});
