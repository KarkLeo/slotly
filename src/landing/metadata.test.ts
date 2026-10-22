import { describe, expect, it } from "vitest";
import type { Landing } from "./landing";
import { landingMetadata } from "./metadata";

const landing: Landing = {
  id: "m",
  slug: "olena-nails",
  name: "Олена Мельник",
  primaryLocale: "uk",
  locales: ["uk", "en"],
  currency: "UAH",
  published: true,
  categories: [
    { id: "c", position: 0, name: { uk: "Манікюр", en: "Manicure" } },
  ],
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
};

const t = (key: string, values: Record<string, string>) =>
  `${key} ${JSON.stringify(values)}`;

describe("landingMetadata", () => {
  it("describes the landing in its language with every language version", () => {
    expect(landingMetadata(landing, "en", t)).toEqual({
      title: 'metaTitle {"name":"Олена Мельник"}',
      description:
        'metaDescription {"name":"Олена Мельник","specialties":"Manicure"}',
      alternates: {
        canonical: "/olena-nails/en",
        languages: {
          uk: "/olena-nails",
          en: "/olena-nails/en",
          "x-default": "/olena-nails",
        },
      },
      robots: undefined,
    });
  });

  it("keeps an unpublished landing out of search results", () => {
    expect(
      landingMetadata({ ...landing, published: false }, "uk", t).robots,
    ).toEqual({ index: false, follow: false });
  });

  it("describes a landing without categories by name only", () => {
    expect(
      landingMetadata({ ...landing, categories: [] }, "uk", t).description,
    ).toBe('metaDescriptionPlain {"name":"Олена Мельник"}');
  });
});
