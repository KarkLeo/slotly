import { describe, expect, it } from "vitest";
import { toLanding } from "./landing";

describe("toLanding", () => {
  it("maps a master row with categories and active services", () => {
    const landing = toLanding({
      id: "m",
      slug: "olena-nails",
      name: "Олена Мельник",
      primary_locale: "uk",
      locales: ["uk", "en"],
      currency: "UAH",
      timezone: "Europe/Kyiv",
      horizon_days: 30,
      published_at: "2026-10-23T00:00:00Z",
      service_categories: [{ id: "c", position: 0, name: { uk: "Манікюр" } }],
      services: [
        {
          id: "s",
          category_id: "c",
          position: 0,
          name: { uk: "Манікюр з покриттям" },
          description: {},
          duration_minutes: 90,
          price_kind: "fixed",
          price: 900,
          format: "on_site",
          archived_at: null,
        },
        {
          id: "old",
          category_id: "c",
          position: 1,
          name: { uk: "Френч" },
          description: {},
          duration_minutes: 90,
          price_kind: "fixed",
          price: 1000,
          format: "on_site",
          archived_at: "2026-10-01T00:00:00Z",
        },
      ],
    });

    expect(landing).toEqual({
      id: "m",
      slug: "olena-nails",
      name: "Олена Мельник",
      primaryLocale: "uk",
      locales: ["uk", "en"],
      currency: "UAH",
      timeZone: "Europe/Kyiv",
      horizonDays: 30,
      published: true,
      categories: [{ id: "c", position: 0, name: { uk: "Манікюр" } }],
      services: [
        {
          id: "s",
          categoryId: "c",
          position: 0,
          name: { uk: "Манікюр з покриттям" },
          description: {},
          durationMinutes: 90,
          priceKind: "fixed",
          price: 900,
          format: "on_site",
        },
      ],
    });
  });
});
