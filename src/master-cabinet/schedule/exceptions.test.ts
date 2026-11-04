import { describe, expect, it } from "vitest";
import {
  groupExceptions,
  overlappingPeriods,
  periodLength,
} from "./exceptions";

const off = (day: string) => ({ day, hours: [] });
const short = [{ start: 600, end: 840 }];

describe("groupExceptions", () => {
  it("merges consecutive days with equal hours", () => {
    expect(
      groupExceptions(
        [off("2026-11-25"), off("2026-11-26"), off("2026-11-27")],
        "2026-11-04",
      ),
    ).toEqual([{ from: "2026-11-25", to: "2026-11-27", hours: [] }]);
  });

  it("keeps a gap and different hours apart", () => {
    expect(
      groupExceptions(
        [
          off("2026-11-10"),
          off("2026-11-12"),
          { day: "2026-11-13", hours: short },
        ],
        "2026-11-04",
      ),
    ).toEqual([
      { from: "2026-11-10", to: "2026-11-10", hours: [] },
      { from: "2026-11-12", to: "2026-11-12", hours: [] },
      { from: "2026-11-13", to: "2026-11-13", hours: short },
    ]);
  });

  it("starts a period that straddles today at today", () => {
    expect(
      groupExceptions(
        [
          off("2026-11-02"),
          off("2026-11-03"),
          off("2026-11-04"),
          off("2026-11-05"),
        ],
        "2026-11-04",
      ),
    ).toEqual([{ from: "2026-11-04", to: "2026-11-05", hours: [] }]);
  });

  it("orders unsorted days", () => {
    expect(
      groupExceptions([off("2026-11-06"), off("2026-11-05")], "2026-11-04"),
    ).toEqual([{ from: "2026-11-05", to: "2026-11-06", hours: [] }]);
  });
});

describe("periodLength", () => {
  it("counts both ends", () => {
    expect(periodLength("2026-11-25", "2026-11-25")).toBe(1);
    expect(periodLength("2026-11-25", "2026-12-02")).toBe(8);
  });
});

describe("overlappingPeriods", () => {
  const a = { from: "2026-11-10", to: "2026-11-12", hours: [] };
  const b = { from: "2026-11-20", to: "2026-11-22", hours: [] };

  it("returns periods that touch the range", () => {
    expect(
      overlappingPeriods([a, b], "2026-11-12", "2026-11-20", null),
    ).toEqual([a, b]);
    expect(
      overlappingPeriods([a, b], "2026-11-13", "2026-11-19", null),
    ).toEqual([]);
  });

  it("leaves out the edited period", () => {
    expect(overlappingPeriods([a, b], "2026-11-10", "2026-11-11", a)).toEqual(
      [],
    );
  });
});
