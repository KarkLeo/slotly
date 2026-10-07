import { describe, expect, it } from "vitest";
import { defaultNextPath, isAppPath, safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it("keeps local paths with query strings", () => {
    expect(safeNextPath("/app/calendar?week=2")).toBe("/app/calendar?week=2");
  });

  it("rejects anything that could leave the site", () => {
    for (const value of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "app",
      "",
      undefined,
      null,
    ]) {
      expect(safeNextPath(value)).toBe(defaultNextPath);
    }
  });
});

describe("isAppPath", () => {
  it("matches the cabinet and its children only", () => {
    expect(isAppPath("/app")).toBe(true);
    expect(isAppPath("/app/today")).toBe(true);
    expect(isAppPath("/application")).toBe(false);
    expect(isAppPath("/anna")).toBe(false);
  });
});
