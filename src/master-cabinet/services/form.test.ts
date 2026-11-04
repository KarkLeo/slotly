import { describe, expect, it } from "vitest";
import {
  parseCategoryForm,
  parseMinutes,
  parsePrice,
  parseServiceForm,
} from "./form";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.append(key, value);
  return data;
}

const valid = {
  "name.uk": "Манікюр",
  "name.en": "",
  "description.uk": "",
  "description.en": "",
  categoryId: "",
  durationMinutes: "90",
  bufferMinutes: "15",
  priceKind: "fixed",
  price: "900",
  format: "on_site",
};

const context = {
  locales: ["uk", "en"],
  primaryLocale: "uk",
  existing: { name: {}, description: {} },
} as const;

describe("parseMinutes", () => {
  it("accepts whole 5-minute steps in range", () => {
    expect(parseMinutes("90", 5, 720)).toBe(90);
    expect(parseMinutes(" 720 ", 5, 720)).toBe(720);
    expect(parseMinutes("0", 0, 240)).toBe(0);
  });

  it.each(["", "abc", "62", "725", "0", "-5", "1.5"])("rejects %j", (raw) => {
    expect(parseMinutes(raw, 5, 720)).toBeNull();
  });
});

describe("parsePrice", () => {
  it("accepts a comma, a dot and spaces between thousands", () => {
    expect(parsePrice("900")).toBe(900);
    expect(parsePrice("900,50")).toBe(900.5);
    expect(parsePrice("900.5")).toBe(900.5);
    expect(parsePrice("1 200")).toBe(1200);
    expect(parsePrice("99999999.99")).toBe(99999999.99);
    expect(parsePrice("0")).toBe(0);
  });

  it.each(["", "abc", "-1", "1,234,5", "9.999", "100000000"])(
    "rejects %j",
    (raw) => {
      expect(parsePrice(raw)).toBeNull();
    },
  );
});

describe("parseServiceForm", () => {
  it("returns a row for a valid form", () => {
    expect(parseServiceForm(form(valid), context)).toEqual({
      values: {
        categoryId: null,
        name: { uk: "Манікюр" },
        description: {},
        durationMinutes: 90,
        bufferMinutes: 15,
        priceKind: "fixed",
        price: 900,
        format: "on_site",
      },
    });
  });

  it("stores no amount for a service without a price", () => {
    const result = parseServiceForm(
      form({ ...valid, priceKind: "none", price: "oops" }),
      context,
    );
    expect(result.values?.price).toBeNull();
    expect(result.values?.priceKind).toBe("none");
  });

  it("requires the name in the primary language", () => {
    const result = parseServiceForm(
      form({ ...valid, "name.uk": "  ", "name.en": "Manicure" }),
      context,
    );
    expect(result.errors).toEqual(["name"]);
  });

  it("reports every invalid field", () => {
    const result = parseServiceForm(
      form({
        ...valid,
        "name.en": "x".repeat(101),
        "description.uk": "x".repeat(1001),
        durationMinutes: "7",
        bufferMinutes: "300",
        price: "",
      }),
      context,
    );
    expect(result.errors).toEqual([
      "name",
      "description",
      "duration",
      "buffer",
      "price",
    ]);
  });

  it("keeps translations of languages the master turned off", () => {
    const result = parseServiceForm(form(valid), {
      ...context,
      existing: {
        name: { uk: "Старе", ru: "Маникюр" },
        description: { ru: "Описание" },
      },
    });
    expect(result.values?.name).toEqual({ uk: "Манікюр", ru: "Маникюр" });
    expect(result.values?.description).toEqual({ ru: "Описание" });
  });

  it("removes a translation the master cleared", () => {
    const result = parseServiceForm(form(valid), {
      ...context,
      existing: { name: { uk: "Манікюр", en: "Manicure" }, description: {} },
    });
    expect(result.values?.name).toEqual({ uk: "Манікюр" });
  });

  it("ignores a language the master does not have", () => {
    const result = parseServiceForm(
      form({ ...valid, "name.ru": "Маникюр" }),
      context,
    );
    expect(result.values?.name).toEqual({ uk: "Манікюр" });
  });

  it.each([
    { categoryId: "not-a-uuid" },
    { priceKind: "free" },
    { format: "nowhere" },
  ])("treats a tampered value as invalid: %j", (patch) => {
    expect(parseServiceForm(form({ ...valid, ...patch }), context)).toEqual({
      invalid: true,
    });
  });
});

describe("parseCategoryForm", () => {
  const categoryContext = {
    locales: ["uk", "en"],
    primaryLocale: "uk",
    existing: {},
  } as const;

  it("returns the translated name", () => {
    expect(
      parseCategoryForm(
        form({ "name.uk": " Нігті ", "name.en": "Nails" }),
        categoryContext,
      ),
    ).toEqual({ name: { uk: "Нігті", en: "Nails" } });
  });

  it("requires the name in the primary language", () => {
    expect(
      parseCategoryForm(
        form({ "name.uk": "", "name.en": "Nails" }),
        categoryContext,
      ),
    ).toEqual({ error: "name" });
  });

  it("limits the length", () => {
    expect(
      parseCategoryForm(form({ "name.uk": "x".repeat(101) }), categoryContext),
    ).toEqual({ error: "name" });
  });
});
