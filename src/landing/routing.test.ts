import { describe, expect, it } from "vitest";
import {
  landingPath,
  resolveLandingLocale,
  resolveLandingSlug,
} from "./routing";

const master = { primaryLocale: "uk", locales: ["uk", "en"] } as const;

describe("resolveLandingLocale", () => {
  it("shows the primary language without a prefix", () => {
    expect(resolveLandingLocale(undefined, master)).toEqual({
      kind: "page",
      locale: "uk",
    });
  });

  it("shows another enabled language under its prefix", () => {
    expect(resolveLandingLocale(["en"], master)).toEqual({
      kind: "page",
      locale: "en",
    });
  });

  it("redirects the primary language prefix to the bare address", () => {
    expect(resolveLandingLocale(["uk"], master)).toEqual({ kind: "redirect" });
  });

  it("does not know languages the master has not enabled", () => {
    expect(resolveLandingLocale(["ru"], master)).toEqual({ kind: "notFound" });
    expect(resolveLandingLocale(["de"], master)).toEqual({ kind: "notFound" });
  });

  it("does not know deeper paths", () => {
    expect(resolveLandingLocale(["en", "extra"], master)).toEqual({
      kind: "notFound",
    });
  });
});

describe("landingPath", () => {
  it("builds the address of a landing in a language", () => {
    expect(landingPath("olena-nails", "uk", "uk")).toBe("/olena-nails");
    expect(landingPath("olena-nails", "en", "uk")).toBe("/olena-nails/en");
  });
});

describe("resolveLandingSlug", () => {
  it("accepts a valid lowercase slug", () => {
    expect(resolveLandingSlug("olena-nails")).toEqual({ kind: "page" });
  });

  it("redirects a valid slug typed in another case", () => {
    expect(resolveLandingSlug("Olena-Nails")).toEqual({
      kind: "redirect",
      slug: "olena-nails",
    });
  });

  it("does not look up paths that cannot be a slug", () => {
    expect(resolveLandingSlug("robots.txt")).toEqual({ kind: "notFound" });
    expect(resolveLandingSlug("app")).toEqual({ kind: "notFound" });
    expect(resolveLandingSlug("APP")).toEqual({ kind: "notFound" });
  });
});
