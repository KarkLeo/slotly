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

function endonym(locale: Locale): string {
  const name = new Intl.DisplayNames([locale], { type: "language" }).of(locale);
  return name
    ? name.charAt(0).toLocaleUpperCase(locale) + name.slice(1)
    : locale;
}

function currencyLabel(code: string, locale: Locale): string {
  const symbol = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    currencyDisplay: "narrowSymbol",
  })
    .formatToParts(0)
    .find((part) => part.type === "currency")?.value;
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
            date: new Intl.DateTimeFormat(locale, {
              timeZone: data.timeZone,
              day: "numeric",
              month: "long",
            }).format(new Date(nextChangeAt)),
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
