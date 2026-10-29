import { describe, expect, it } from "vitest";
import { activeSection, isMoreActive, sections } from "./sections";

describe("activeSection", () => {
  it.each([
    ["/app", "today"],
    ["/app/calendar", "calendar"],
    ["/app/calendar/2026-10-29", "calendar"],
    ["/app/appointments/new", "appointments"],
    ["/app/settings", "settings"],
    ["/app/blocks/new", null],
    ["/app/bookings", null],
    ["/app/calendarx", null],
  ])("%s → %s", (path, key) => expect(activeSection(path)).toBe(key));
});

describe("isMoreActive", () => {
  it("is true only for sections in «Ще»", () => {
    expect(isMoreActive("/app/services")).toBe(true);
    expect(isMoreActive("/app/clients")).toBe(false);
    expect(isMoreActive("/app/blocks/new")).toBe(false);
  });
});

it("puts three sections in the bar and six in «Ще»", () => {
  expect(sections.filter((s) => s.place === "bar").map((s) => s.key)).toEqual([
    "today",
    "calendar",
    "clients",
  ]);
  expect(sections.filter((s) => s.place === "more")).toHaveLength(6);
});
