import { describe, expect, it } from "vitest";
import type { Landing } from "./landing";
import { toLandingView } from "./view";

const landing: Landing = {
  id: "m",
  slug: "olena-nails",
  name: "Олена Мельник",
  primaryLocale: "uk",
  locales: ["uk", "en"],
  currency: "UAH",
  timeZone: "Europe/Kyiv",
  horizonDays: 30,
  cancelDeadlineMinutes: 720,
  published: true,
  categories: [
    { id: "c", position: 0, name: { uk: "Манікюр", en: "Manicure" } },
  ],
  services: [
    {
      id: "s1",
      categoryId: "c",
      position: 0,
      name: { uk: "Манікюр з покриттям", en: "Gel manicure" },
      description: { uk: "Догляд і покриття" },
      durationMinutes: 90,
      priceKind: "fixed",
      price: 900,
      format: "on_site",
    },
    {
      id: "s2",
      categoryId: null,
      position: 0,
      name: { uk: "Консультація" },
      description: {},
      durationMinutes: 30,
      priceKind: "none",
      price: null,
      format: "online",
    },
  ],
};

describe("toLandingView", () => {
  it("translates, formats and groups the landing for a language", () => {
    const view = toLandingView(landing, "en");

    expect(view.name).toBe("Олена Мельник");
    expect(view.initials).toBe("ОМ");
    expect([
      view.timeZone,
      view.horizonDays,
      view.cancelDeadlineMinutes,
    ]).toEqual(["Europe/Kyiv", 30, 720]);
    expect(view.specialties).toEqual(["Manicure"]);
    expect(view.languages).toEqual([
      {
        locale: "uk",
        name: "українська",
        href: "/olena-nails",
        current: false,
      },
      { locale: "en", name: "English", href: "/olena-nails/en", current: true },
    ]);
    expect(view.groups.map((group) => group.title)).toEqual(["Manicure", null]);
    expect(view.services[0]).toEqual({
      id: "s1",
      name: "Gel manicure",
      description: "Догляд і покриття",
      duration: "1 hr, 30 min",
      price: { kind: "fixed", amount: "UAH\u00a0900" },
      format: "on_site",
    });
    expect(view.services[1].price).toEqual({ kind: "none", amount: null });
  });

  it("offers no language links for a single-language landing", () => {
    expect(
      toLandingView({ ...landing, locales: ["uk"] }, "uk").languages,
    ).toEqual([]);
  });
});
