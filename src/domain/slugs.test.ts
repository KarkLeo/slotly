import { describe, expect, it } from "vitest";
import { locales } from "@/i18n/locales";
import { isReservedSlug } from "./slugs";

describe("isReservedSlug", () => {
  it("reserves platform routes regardless of case", () => {
    expect(isReservedSlug("app")).toBe(true);
    expect(isReservedSlug("OAuth")).toBe(true);
  });

  it("reserves every interface locale code", () => {
    for (const locale of locales) expect(isReservedSlug(locale)).toBe(true);
  });

  it("allows ordinary master slugs", () => {
    expect(isReservedSlug("anna")).toBe(false);
  });
});
