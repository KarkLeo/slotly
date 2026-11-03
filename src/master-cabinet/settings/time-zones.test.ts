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

  it("finds a zone by city and by localized region", () => {
    expect(searchTimeZones(options, "kyiv").map((o) => o.id)).toContain(
      "Europe/Kyiv",
    );
    const region = option("Europe/Kyiv")?.region ?? "";
    expect(
      searchTimeZones(options, region.toUpperCase()).map((o) => o.id),
    ).toContain("Europe/Kyiv");
  });
});
