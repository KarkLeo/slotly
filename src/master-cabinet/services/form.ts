import { z } from "zod";
import type { Database } from "@/db/types";
import type { Locale } from "@/i18n/locales";
import type { LocalizedText } from "@/landing/localize";

type Enums = Database["public"]["Enums"];

export const priceKinds = [
  "fixed",
  "from",
  "none",
] as const satisfies readonly Enums["price_kind"][];
export const serviceFormats = [
  "on_site",
  "online",
  "at_client",
] as const satisfies readonly Enums["service_format"][];

export const nameMaxLength = 100;
export const descriptionMaxLength = 1000;

export type ServiceField =
  "name" | "description" | "duration" | "buffer" | "price";

export type ServiceValues = {
  categoryId: string | null;
  name: LocalizedText;
  description: LocalizedText;
  durationMinutes: number;
  bufferMinutes: number;
  priceKind: Enums["price_kind"];
  price: number | null;
  format: Enums["service_format"];
};

export type ServiceFormResult = {
  values?: ServiceValues;
  errors?: ServiceField[];
  invalid?: true;
};

type LocaleContext = {
  locales: readonly Locale[];
  primaryLocale: Locale;
};

const choicesSchema = z.object({
  categoryId: z.union([z.literal(""), z.guid()]),
  priceKind: z.enum(priceKinds),
  format: z.enum(serviceFormats),
});

export function parseMinutes(
  raw: FormDataEntryValue | null,
  min: number,
  max: number,
): number | null {
  const text = String(raw ?? "").trim();
  if (!/^\d{1,4}$/.test(text)) return null;
  const minutes = Number(text);
  return minutes >= min && minutes <= max && minutes % 5 === 0 ? minutes : null;
}

// Masters type prices with a comma and spaces between thousands.
export function parsePrice(raw: FormDataEntryValue | null): number | null {
  const text = String(raw ?? "")
    .replace(/\s/g, "")
    .replace(",", ".");
  return /^\d{1,8}(\.\d{1,2})?$/.test(text) ? Number(text) : null;
}

// Only languages the master has now are overwritten: texts in a language turned off wait for it to come back.
function mergeTranslations(
  formData: FormData,
  field: string,
  locales: readonly Locale[],
  existing: LocalizedText,
): LocalizedText {
  const merged = { ...existing };
  for (const locale of locales) {
    const text = String(formData.get(`${field}.${locale}`) ?? "").trim();
    if (text) merged[locale] = text;
    else delete merged[locale];
  }
  return merged;
}

function fits(text: LocalizedText, maxLength: number) {
  return Object.values(text).every((value) => value.length <= maxLength);
}

function validName(name: LocalizedText, primaryLocale: Locale) {
  return Boolean(name[primaryLocale]) && fits(name, nameMaxLength);
}

export function parseServiceForm(
  formData: FormData,
  {
    locales,
    primaryLocale,
    existing,
  }: LocaleContext & {
    existing: { name: LocalizedText; description: LocalizedText };
  },
): ServiceFormResult {
  const choices = choicesSchema.safeParse({
    categoryId: formData.get("categoryId"),
    priceKind: formData.get("priceKind"),
    format: formData.get("format"),
  });
  if (!choices.success) return { invalid: true };

  const { categoryId, priceKind, format } = choices.data;
  const name = mergeTranslations(formData, "name", locales, existing.name);
  const description = mergeTranslations(
    formData,
    "description",
    locales,
    existing.description,
  );
  const durationMinutes = parseMinutes(formData.get("durationMinutes"), 5, 720);
  const bufferMinutes = parseMinutes(formData.get("bufferMinutes"), 0, 240);
  const price = priceKind === "none" ? null : parsePrice(formData.get("price"));

  const errors: ServiceField[] = [];
  if (!validName(name, primaryLocale)) errors.push("name");
  if (!fits(description, descriptionMaxLength)) errors.push("description");
  if (durationMinutes === null) errors.push("duration");
  if (bufferMinutes === null) errors.push("buffer");
  if (priceKind !== "none" && price === null) errors.push("price");
  if (durationMinutes === null || bufferMinutes === null || errors.length > 0)
    return { errors };

  return {
    values: {
      categoryId: categoryId || null,
      name,
      description,
      durationMinutes,
      bufferMinutes,
      priceKind,
      price,
      format,
    },
  };
}

export function parseCategoryForm(
  formData: FormData,
  {
    locales,
    primaryLocale,
    existing,
  }: LocaleContext & { existing: LocalizedText },
): { name: LocalizedText } | { error: "name" } {
  const name = mergeTranslations(formData, "name", locales, existing);
  return validName(name, primaryLocale) ? { name } : { error: "name" };
}
