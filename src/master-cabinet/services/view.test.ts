import { describe, expect, it } from "vitest";
import { type ServiceData, type ServicesData, toServicesView } from "./view";

const service = (patch: Partial<ServiceData>): ServiceData => ({
  id: "s",
  categoryId: null,
  position: 0,
  name: { uk: "Манікюр", en: "Manicure" },
  description: {},
  durationMinutes: 90,
  bufferMinutes: 15,
  priceKind: "fixed",
  price: 900,
  format: "on_site",
  archived: false,
  ...patch,
});

const data: ServicesData = {
  currency: "UAH",
  primaryLocale: "en",
  locales: ["uk", "en"],
  categories: [
    { id: "b", position: 1, name: { uk: "Брови" } },
    { id: "a", position: 0, name: { uk: "Нігті", en: "Nails" } },
  ],
  services: [
    service({ id: "s2", categoryId: "a", position: 1 }),
    service({ id: "s1", categoryId: "a", position: 0 }),
    service({ id: "s3", categoryId: null }),
    service({ id: "s4", categoryId: "a", archived: true }),
  ],
};

describe("toServicesView", () => {
  it("lists languages with the primary one first", () => {
    expect(toServicesView(data, "uk").languages).toEqual([
      { locale: "en", label: "English" },
      { locale: "uk", label: "Українська" },
    ]);
  });

  it("orders categories and counts their active services", () => {
    expect(
      toServicesView(data, "en").categories.map((c) => [
        c.id,
        c.title,
        c.serviceCount,
      ]),
    ).toEqual([
      ["a", "Nails", 2],
      ["b", "Брови", 0],
    ]);
  });

  it("groups active services and skips empty categories", () => {
    const { groups } = toServicesView(data, "en");
    expect(groups.map((g) => [g.id, g.title])).toEqual([
      ["a", "Nails"],
      [null, null],
    ]);
    expect(groups[0].services.map((s) => s.id)).toEqual(["s1", "s2"]);
  });

  it("keeps archived services apart", () => {
    const view = toServicesView(data, "en");
    expect(view.archived.map((s) => s.id)).toEqual(["s4"]);
    expect(
      view.groups.flatMap((g) => g.services).map((s) => s.id),
    ).not.toContain("s4");
  });

  it("formats the row in the screen language", () => {
    const item = toServicesView(data, "uk").groups[0].services[0];
    expect(item.title).toBe("Манікюр");
    expect(item.duration).toBe(
      new Intl.DurationFormat("uk", { style: "short" }).format({
        hours: 1,
        minutes: 30,
      }),
    );
    expect(item.buffer).toBe(
      new Intl.DurationFormat("uk", { style: "short" }).format({
        hours: 0,
        minutes: 15,
      }),
    );
    expect(item.amount).toContain("900");
  });

  it("has no buffer or amount to show when there are none", () => {
    const view = toServicesView(
      {
        ...data,
        services: [
          service({ bufferMinutes: 0, priceKind: "none", price: null }),
        ],
      },
      "en",
    );
    expect(view.groups[0].services[0].buffer).toBeNull();
    expect(view.groups[0].services[0].amount).toBeNull();
  });
});
