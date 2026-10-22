import { describe, expect, it } from "vitest";
import { localize } from "./localize";

describe("localize", () => {
  it("returns the text in the requested language", () => {
    expect(localize({ uk: "Манікюр", en: "Manicure" }, "en", "uk")).toBe(
      "Manicure",
    );
  });

  it("falls back to the master's primary language", () => {
    expect(localize({ uk: "Манікюр" }, "en", "uk")).toBe("Манікюр");
  });

  it("falls back to any translation when the primary one is missing", () => {
    expect(localize({ en: "Manicure" }, "ru", "uk")).toBe("Manicure");
  });

  it("returns an empty string for an empty text", () => {
    expect(localize({}, "uk", "uk")).toBe("");
  });
});
