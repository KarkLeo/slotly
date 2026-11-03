import { createTranslator } from "next-intl";
import { within } from "storybook/test";
import en from "../../../messages/en.json";
import ru from "../../../messages/ru.json";
import uk from "../../../messages/uk.json";
import { isLocale, type Locale } from "@/i18n/locales";
import type { SettingsData } from "./load";
import { type TimeZoneOption, timeZoneOptions } from "./time-zones";
import { type SettingsView, toSettingsView } from "./view";

// A fixed instant keeps zone offsets the same whenever the stories run.
const now = new Date("2026-11-03T12:00:00Z");

export const siteHost = "slotly.karkleo.com";

// 40 characters with no hyphen to break at, the hardest slug to wrap at 360 px.
export const longSlug = "anastasiakovalmanicurepedicurekyivpodil1";

const published: SettingsData = {
  name: "Анна Коваль",
  slug: "anna-nails",
  retiredSlugs: [],
  primaryLocale: "uk",
  locales: ["uk", "en"],
  timeZone: "Europe/Kyiv",
  currency: "UAH",
  published: true,
  everPublished: true,
  slugPolicy: {
    limited: true,
    nextChangeAt: null,
    lastChangeAt: null,
    changesLeft: 3,
  },
};

export const settingsStories = {
  published,
  slugLocked: {
    ...published,
    slug: "anna-kyiv",
    retiredSlugs: ["anna-nails"],
    slugPolicy: {
      limited: true,
      nextChangeAt: "2026-12-02T23:30:00Z",
      lastChangeAt: "2026-11-03T09:00:00Z",
      changesLeft: 2,
    },
  },
  neverPublished: {
    ...published,
    published: false,
    everPublished: false,
    slugPolicy: {
      limited: false,
      nextChangeAt: null,
      lastChangeAt: null,
      changesLeft: 3,
    },
  },
  unpublished: { ...published, published: false },
  longSlug: {
    ...published,
    slug: longSlug,
    retiredSlugs: ["anastasiakovalmanicurepedicurelvivcentr2"],
  },
} satisfies Record<string, SettingsData>;

export function settingsView(data: SettingsData, locale: Locale): SettingsView {
  return toSettingsView(data, locale, now);
}

const zones = new Map<Locale, TimeZoneOption[]>();

export function storyTimeZones(locale: Locale): TimeZoneOption[] {
  const cached = zones.get(locale);
  if (cached) return cached;
  const options = timeZoneOptions(locale, now, [published.timeZone]);
  zones.set(locale, options);
  return options;
}

export const dictionaries = { uk, ru, en };

export const localeOf = (value: unknown): Locale =>
  isLocale(value) ? value : "uk";

export const formatterOf = (locale: unknown) =>
  createTranslator({
    locale: localeOf(locale),
    messages: dictionaries[localeOf(locale)],
    namespace: "MasterCabinet.settings",
  });

export const row = (canvas: HTMLElement, label: string) =>
  within(canvas).getByRole("button", { name: new RegExp(`^${label}`) });
