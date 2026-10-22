import { describe, expect, it } from "vitest";
import { locales } from "@/i18n/locales";
import { isReservedSlug, isValidSlug } from "./slugs";

describe("isReservedSlug", () => {
  it("reserves platform routes regardless of case", () => {
    expect(isReservedSlug("app")).toBe(true);
    expect(isReservedSlug("OAuth")).toBe(true);
    expect(isReservedSlug("robots")).toBe(true);
  });

  it("reserves every interface locale code", () => {
    for (const locale of locales) expect(isReservedSlug(locale)).toBe(true);
  });

  it("allows ordinary master slugs", () => {
    expect(isReservedSlug("anna")).toBe(false);
  });
});

describe("isValidSlug", () => {
  it("accepts lowercase words joined by single hyphens", () => {
    expect(isValidSlug("olena")).toBe(true);
    expect(isValidSlug("olena-nails-2")).toBe(true);
  });

  it("rejects what the database rejects", () => {
    expect(isValidSlug("Olena")).toBe(false);
    expect(isValidSlug("ol")).toBe(false);
    expect(isValidSlug("2olena")).toBe(false);
    expect(isValidSlug("olena--nails")).toBe(false);
    expect(isValidSlug("olena-")).toBe(false);
    expect(isValidSlug("a".repeat(41))).toBe(false);
    expect(isValidSlug("robots.txt")).toBe(false);
    expect(isValidSlug("oauth")).toBe(false);
  });
});
