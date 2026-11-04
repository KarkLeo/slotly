import { describe, expect, it } from "vitest";
import {
  areValidIntervals,
  formatHours,
  intervalsLabel,
  mergeIntervals,
  parseHours,
  timeChoices,
  timeLabel,
} from "./hours";

describe("parseHours and formatHours", () => {
  it.each(["{[600,840),[900,1140)}", "{}", "{[1320,1440)}"])(
    "round-trips %s",
    (literal) => {
      const intervals = parseHours(literal);
      expect(intervals).not.toBeNull();
      expect(formatHours(intervals ?? [])).toBe(literal);
    },
  );

  it("parses intervals into minutes", () => {
    expect(parseHours("{[600,840),[900,1140)}")).toEqual([
      { start: 600, end: 840 },
      { start: 900, end: 1140 },
    ]);
  });

  it("rejects text that is not a multirange", () => {
    expect(parseHours("nonsense")).toBeNull();
    expect(parseHours("{[600,840]}")).toBeNull();
  });
});

describe("areValidIntervals", () => {
  it("accepts empty, adjacent and ending at midnight", () => {
    expect(areValidIntervals([])).toBe(true);
    expect(
      areValidIntervals([
        { start: 600, end: 840 },
        { start: 840, end: 1140 },
      ]),
    ).toBe(true);
    expect(areValidIntervals([{ start: 1320, end: 1440 }])).toBe(true);
  });

  it("rejects overlaps, reversed, out of range and off-grid values", () => {
    expect(
      areValidIntervals([
        { start: 600, end: 840 },
        { start: 800, end: 900 },
      ]),
    ).toBe(false);
    expect(areValidIntervals([{ start: 840, end: 600 }])).toBe(false);
    expect(areValidIntervals([{ start: 600, end: 600 }])).toBe(false);
    expect(areValidIntervals([{ start: 600, end: 1445 }])).toBe(false);
    expect(areValidIntervals([{ start: 607, end: 840 }])).toBe(false);
  });
});

describe("mergeIntervals", () => {
  it("sorts and joins adjacent and overlapping intervals", () => {
    expect(
      mergeIntervals([
        { start: 840, end: 1140 },
        { start: 600, end: 840 },
        { start: 1200, end: 1260 },
      ]),
    ).toEqual([
      { start: 600, end: 1140 },
      { start: 1200, end: 1260 },
    ]);
  });
});

describe("labels", () => {
  it("formats minutes as clock time", () => {
    expect(timeLabel(0)).toBe("00:00");
    expect(timeLabel(605)).toBe("10:05");
    expect(timeLabel(1440)).toBe("24:00");
  });

  it("joins intervals", () => {
    expect(
      intervalsLabel([
        { start: 600, end: 840 },
        { start: 900, end: 1140 },
      ]),
    ).toBe("10:00–14:00, 15:00–19:00");
  });
});

describe("timeChoices", () => {
  it("lists start times from 00:00 to 23:45", () => {
    const choices = timeChoices("start", 600);
    expect(choices[0]).toBe(0);
    expect(choices.at(-1)).toBe(1425);
  });

  it("lists end times from 00:15 to 24:00", () => {
    const choices = timeChoices("end", 600);
    expect(choices[0]).toBe(15);
    expect(choices.at(-1)).toBe(1440);
  });

  it("keeps an off-grid current value in order", () => {
    const choices = timeChoices("end", 550);
    expect(choices).toContain(550);
    expect(choices).toEqual([...choices].sort((a, b) => a - b));
    expect(choices.indexOf(550)).toBe(choices.indexOf(540) + 1);
  });
});
