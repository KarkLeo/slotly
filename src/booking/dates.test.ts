import { describe, expect, it } from "vitest";
import {
  addDays,
  dayLabel,
  dayRanges,
  groupSlots,
  horizonDates,
  localDate,
  slotDateTimeLabel,
  zoneLabel,
} from "./dates";

describe("localDate", () => {
  it("reads the date in the master's time zone", () => {
    expect(localDate(new Date("2026-10-23T21:30:00Z"), "Europe/Kyiv")).toBe(
      "2026-10-24",
    );
    expect(localDate(new Date("2026-10-23T20:30:00Z"), "Europe/Kyiv")).toBe(
      "2026-10-23",
    );
  });
});

describe("addDays", () => {
  it("moves across months and years", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("horizonDates", () => {
  it("lists every date from today to the end of the horizon", () => {
    expect(horizonDates("2026-10-30", 3)).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
  });
});

describe("dayRanges", () => {
  it("splits dates into requests of at most 62 days", () => {
    const dates = horizonDates("2026-01-01", 99);
    expect(dayRanges(dates)).toEqual([
      ["2026-01-01", "2026-03-03"],
      ["2026-03-04", "2026-04-10"],
    ]);
  });
});

describe("groupSlots", () => {
  it("groups slots into morning, day and evening in the master's time", () => {
    expect(
      groupSlots(
        [
          "2026-10-24T06:00:00+00:00",
          "2026-10-24T08:45:00+00:00",
          "2026-10-24T09:00:00+00:00",
          "2026-10-24T13:59:00+00:00",
          "2026-10-24T14:00:00+00:00",
        ],
        "Europe/Kyiv",
        "uk",
      ),
    ).toEqual([
      {
        period: "morning",
        slots: [
          { value: "2026-10-24T06:00:00+00:00", label: "09:00" },
          { value: "2026-10-24T08:45:00+00:00", label: "11:45" },
        ],
      },
      {
        period: "day",
        slots: [
          { value: "2026-10-24T09:00:00+00:00", label: "12:00" },
          { value: "2026-10-24T13:59:00+00:00", label: "16:59" },
        ],
      },
      {
        period: "evening",
        slots: [{ value: "2026-10-24T14:00:00+00:00", label: "17:00" }],
      },
    ]);
  });

  it("reads hours in local time on the day the clocks go back", () => {
    expect(
      groupSlots(
        [
          "2026-10-25T00:30:00+00:00",
          "2026-10-25T09:30:00+00:00",
          "2026-10-25T10:00:00+00:00",
        ],
        "Europe/Kyiv",
        "uk",
      ),
    ).toEqual([
      {
        period: "morning",
        slots: [
          { value: "2026-10-25T00:30:00+00:00", label: "03:30" },
          { value: "2026-10-25T09:30:00+00:00", label: "11:30" },
        ],
      },
      {
        period: "day",
        slots: [{ value: "2026-10-25T10:00:00+00:00", label: "12:00" }],
      },
    ]);
  });

  it("leaves out empty periods", () => {
    expect(
      groupSlots(["2026-10-24T15:00:00+00:00"], "Europe/Kyiv", "uk").map(
        (group) => group.period,
      ),
    ).toEqual(["evening"]);
  });
});

describe("labels", () => {
  it("names a date for the strip", () => {
    expect(dayLabel("2026-10-24", "uk")).toEqual({
      weekday: "сб",
      day: "24",
      month: "жовтень",
      full: "субота, 24 жовтня",
    });
  });

  it("names a slot with its date in the master's time", () => {
    expect(
      slotDateTimeLabel("2026-10-24T08:45:00+00:00", "Europe/Kyiv", "uk"),
    ).toBe("сб, 24 жовтня о 11:45");
  });

  it("names the master's time zone", () => {
    expect(zoneLabel("Europe/Kyiv", "uk")).toBe("за східноєвропейським часом");
    expect(zoneLabel("Europe/Kyiv", "en")).toBe("Eastern European Time");
  });
});
