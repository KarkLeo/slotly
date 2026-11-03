import { describe, expect, it } from "vitest";
import type { SettingsData } from "./load";
import { toSettingsView } from "./view";

const now = new Date("2026-11-03T12:00:00Z");
const base: SettingsData = {
  name: "Anna",
  slug: "anna-kyiv",
  retiredSlugs: ["anna-nails"],
  primaryLocale: "uk",
  locales: ["uk"],
  timeZone: "Europe/Kyiv",
  currency: "UAH",
  published: true,
  everPublished: true,
  slugPolicy: {
    limited: true,
    nextChangeAt: null,
    lastChangeAt: null,
    changesLeft: 2,
  },
};
const view = (patch: Partial<SettingsData> = {}, locale: "uk" | "en" = "uk") =>
  toSettingsView({ ...base, ...patch }, locale, now);

describe("toSettingsView", () => {
  it("leaves slug changes unlimited before the first publication", () => {
    expect(
      view({
        published: false,
        everPublished: false,
        slugPolicy: {
          limited: false,
          nextChangeAt: null,
          lastChangeAt: null,
          changesLeft: 3,
        },
      }),
    ).toMatchObject({
      slugLock: null,
      changesLeft: null,
      publication: "neverPublished",
    });
  });

  it("tells unpublished from published", () => {
    expect(view().publication).toBe("published");
    expect(view({ published: false }).publication).toBe("unpublished");
  });

  it("dates the slug lock in the master's time zone", () => {
    const slugPolicy = {
      limited: true,
      nextChangeAt: "2026-12-02T23:30:00Z",
      lastChangeAt: "2026-11-02T23:30:00Z",
      changesLeft: 1,
    };
    expect(view({ slugPolicy }).slugLock).toEqual({
      nextChangeAt: "2026-12-02T23:30:00Z",
      date: "04.12.2026",
      lastChangeDate: "03.11.2026",
    });
    expect(view({ slugPolicy }, "en").slugLock?.date).toBe("12/04/2026");
    expect(view({ slugPolicy }).changesLeft).toBe(1);
  });

  it("keeps the date when the lock ends exactly at local midnight", () => {
    const slugPolicy = {
      limited: true,
      nextChangeAt: "2026-12-02T22:00:00Z",
      lastChangeAt: null,
      changesLeft: 1,
    };
    expect(view({ slugPolicy }).slugLock).toMatchObject({
      date: "03.12.2026",
      lastChangeDate: null,
    });
  });

  it("labels a non-hryvnia currency with its symbol", () => {
    expect(view({ currency: "EUR" }).currency.label).toBe("EUR €");
  });

  it("lists the primary language first", () => {
    expect(
      view({ primaryLocale: "en", locales: ["uk", "en"] }).localesSummary,
    ).toBe("English, Українська");
  });

  it("labels the currency with its symbol", () => {
    expect(view({ currency: "UAH" }).currency.label).toBe("UAH ₴");
  });

  it("selects the canonical zone for a renamed one", () => {
    expect(view({ timeZone: "Europe/Kiev" }).timeZone.id).toBe("Europe/Kyiv");
  });
});
