import type { Locale } from "@/i18n/locales";
import type { SettingsData } from "./load";
import {
  canonicalTimeZone,
  type TimeZoneOption,
  timeZoneOption,
} from "./time-zones";

export const currencies = ["UAH", "EUR", "PLN", "USD"] as const;

export type PublicationState = "published" | "unpublished" | "neverPublished";

export type SettingsView = {
  name: string;
  slug: string;
  retiredSlugs: string[];
  slugLock: { nextChangeAt: string; date: string } | null;
  changesLeft: number | null;
  locales: Locale[];
  primaryLocale: Locale;
  localesSummary: string;
  timeZone: TimeZoneOption;
  currency: { code: string; label: string };
  publication: PublicationState;
};

function publicationState(data: SettingsData): PublicationState {
  if (data.published) return "published";
  return data.everPublished ? "unpublished" : "neverPublished";
}

// The change is allowed from the exact instant, but the first day it is allowed all day is the next one.
function firstFullDay(instant: string, timeZone: string, locale: Locale) {
  const at = new Date(instant);
  const clock = new Intl.DateTimeFormat("en", {
    timeZone,
    hourCycle: "h23",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(at);
  const part = (type: string) =>
    Number(clock.find((p) => p.type === type)?.value ?? 0);
  const midnight =
    part("hour") === 0 &&
    part("minute") === 0 &&
    part("second") === 0 &&
    at.getUTCMilliseconds() === 0;
  // A day later in absolute time lands on the next local day, DST shifts aside.
  const day = midnight ? at : new Date(at.getTime() + 24 * 3600 * 1000);
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(day);
}

function endonym(locale: Locale): string {
  const name = new Intl.DisplayNames([locale], { type: "language" }).of(locale);
  return name
    ? name.charAt(0).toLocaleUpperCase(locale) + name.slice(1)
    : locale;
}

export function currencySymbol(code: string, locale: Locale): string | null {
  return (
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? null
  );
}

export function currencyLabel(code: string, locale: Locale): string {
  const symbol = currencySymbol(code, locale);
  return symbol ? `${code} ${symbol}` : code;
}

export function toSettingsView(
  data: SettingsData,
  locale: Locale,
  now: Date,
): SettingsView {
  const { limited, nextChangeAt, changesLeft } = data.slugPolicy;
  const ordered = [
    data.primaryLocale,
    ...data.locales.filter((l) => l !== data.primaryLocale),
  ];
  return {
    name: data.name,
    slug: data.slug,
    retiredSlugs: data.retiredSlugs,
    slugLock:
      limited && nextChangeAt
        ? {
            nextChangeAt,
            date: firstFullDay(nextChangeAt, data.timeZone, locale),
          }
        : null,
    changesLeft: limited ? changesLeft : null,
    locales: data.locales,
    primaryLocale: data.primaryLocale,
    localesSummary: ordered.map(endonym).join(", "),
    timeZone: timeZoneOption(canonicalTimeZone(data.timeZone), locale, now),
    currency: {
      code: data.currency,
      label: currencyLabel(data.currency, locale),
    },
    publication: publicationState(data),
  };
}
