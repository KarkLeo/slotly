import { describe, expect, it } from "vitest";
import {
  canonicalTimeZone,
  searchTimeZones,
  timeZoneOptions,
} from "./time-zones";

const winter = new Date("2026-01-15T12:00:00Z");
const options = timeZoneOptions("uk", winter, ["Europe/Kyiv"]);
const option = (id: string) => options.find((o) => o.id === id);

describe("time zones", () => {
  it("keeps one Kyiv whatever the platform calls it", () => {
    const ids = timeZoneOptions("uk", winter, [
      "Europe/Kyiv",
      "Europe/Kiev",
    ]).map((o) => o.id);
    expect(
      ids.filter((id) => id.includes("Ky") || id.includes("Kiev")),
    ).toEqual(["Europe/Kyiv"]);
  });

  it("maps renamed zones and passes others through", () => {
    expect(canonicalTimeZone("Asia/Calcutta")).toBe("Asia/Kolkata");
    expect(canonicalTimeZone("Europe/Paris")).toBe("Europe/Paris");
  });

  it("formats the offset as UTC", () => {
    expect(option("Europe/Kyiv")?.offset).toBe("UTC+2");
    expect(option("Europe/London")?.offset).toBe("UTC");
  });

  it("sorts by offset and then city", () => {
    const index = (id: string) => options.findIndex((o) => o.id === id);
    expect(index("America/New_York")).toBeLessThan(index("Europe/London"));
    expect(index("Europe/London")).toBeLessThan(index("Europe/Kyiv"));
  });

  it("writes half-hour and 45-minute offsets and sorts them by minutes", () => {
    const index = (id: string) => options.findIndex((o) => o.id === id);
    expect(option("Asia/Kolkata")?.offset).toBe("UTC+5:30");
    expect(option("Asia/Kathmandu")?.offset).toBe("UTC+5:45");
    const plus5 = options.find((o) => o.offset === "UTC+5");
    const plus6 = options.find((o) => o.offset === "UTC+6");
    expect(index("Asia/Kolkata")).toBeGreaterThan(index(plus5?.id ?? ""));
    expect(index("Asia/Kolkata")).toBeLessThan(index("Asia/Kathmandu"));
    expect(index("Asia/Kathmandu")).toBeLessThan(index(plus6?.id ?? ""));
  });

  it("reuses the list for the same locale, day and zones", () => {
    const later = new Date("2026-01-15T20:00:00Z");
    expect(timeZoneOptions("uk", later, ["Europe/Kyiv"])).toBe(options);
    expect(timeZoneOptions("ru", winter, ["Europe/Kyiv"])).not.toBe(options);
  });

  it("drops the previous day's lists", () => {
    const tomorrow = new Date("2026-01-16T12:00:00Z");
    const next = timeZoneOptions("uk", tomorrow, ["Europe/Kyiv"]);
    expect(next).not.toBe(options);
    expect(timeZoneOptions("uk", tomorrow, ["Europe/Kyiv"])).toBe(next);
    expect(timeZoneOptions("uk", winter, ["Europe/Kyiv"])).not.toBe(options);
  });

  it("finds a zone by city and by localized region", () => {
    expect(searchTimeZones(options, "kyiv").map((o) => o.id)).toContain(
      "Europe/Kyiv",
    );
    const region = option("Europe/Kyiv")?.region ?? "";
    expect(
      searchTimeZones(options, region.toUpperCase()).map((o) => o.id),
    ).toContain("Europe/Kyiv");
  });

  it("finds a zone by its localized country", () => {
    const ru = timeZoneOptions("ru", winter, ["Europe/Kyiv"]);
    expect(searchTimeZones(options, "україна").map((o) => o.id)).toContain(
      "Europe/Kyiv",
    );
    expect(searchTimeZones(ru, "польша").map((o) => o.id)).toContain(
      "Europe/Warsaw",
    );
    expect(option("Europe/Kyiv")?.country).toBe("Україна");
  });
});
