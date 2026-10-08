import { describe, expect, it } from "vitest";
import { defaultNextPath, requiresSignIn, safeNextPath } from "./next-path";

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

describe("requiresSignIn", () => {
  it("matches the cabinet and its children only", () => {
    expect(requiresSignIn("/app")).toBe(true);
    expect(requiresSignIn("/app/today")).toBe(true);
    expect(requiresSignIn("/application")).toBe(false);
    expect(requiresSignIn("/anna")).toBe(false);
  });

  it("matches the OAuth consent page", () => {
    expect(requiresSignIn("/oauth/consent")).toBe(true);
    expect(requiresSignIn("/oauth/consentx")).toBe(false);
  });
});
