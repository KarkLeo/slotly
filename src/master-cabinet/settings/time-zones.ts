import type { Locale } from "@/i18n/locales";

export type TimeZoneOption = {
  id: string;
  city: string;
  region: string;
  country: string;
  offset: string;
};

const renamed: Record<string, string> = {
  "Europe/Kiev": "Europe/Kyiv",
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "America/Godthab": "America/Nuuk",
  "Atlantic/Faeroe": "Atlantic/Faroe",
};

export function canonicalTimeZone(id: string): string {
  return renamed[id] ?? id;
}

function zoneName(
  id: string,
  locale: string,
  name: "longGeneric" | "shortOffset",
  now: Date,
): string {
  return (
    new Intl.DateTimeFormat(locale, { timeZone: id, timeZoneName: name })
      .formatToParts(now)
      .find((part) => part.type === "timeZoneName")?.value ?? id
  );
}

function offsetMinutes(offset: string): number {
  const match = /^UTC(?:([+-])(\d{1,2})(?::(\d{2}))?)?$/.exec(offset);
  if (!match?.[1]) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === "-" ? -minutes : minutes;
}

let countryCodesByZone: Map<string, string[]> | undefined;

function zoneCountryCodes(id: string): string[] {
  if (!countryCodesByZone) {
    countryCodesByZone = new Map();
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (const first of letters) {
      for (const second of letters) {
        const code = first + second;
        const zones = new Intl.Locale(`und-${code}`).getTimeZones?.() ?? [];
        for (const zone of zones) {
          const key = canonicalTimeZone(zone);
          countryCodesByZone.set(key, [
            ...(countryCodesByZone.get(key) ?? []),
            code,
          ]);
        }
      }
    }
  }
  return countryCodesByZone.get(id) ?? [];
}

function countryNames(id: string, locale: Locale): string {
  const names = new Intl.DisplayNames([locale], { type: "region" });
  return zoneCountryCodes(id)
    .map((code) => names.of(code))
    .filter(Boolean)
    .join(", ");
}

export function timeZoneOption(
  id: string,
  locale: Locale,
  now: Date,
): TimeZoneOption {
  return {
    id,
    city: (id.split("/").at(-1) ?? id).replaceAll("_", " "),
    region: zoneName(id, locale, "longGeneric", now),
    country: countryNames(id, locale),
    offset: zoneName(id, "en", "shortOffset", now)
      .replace("GMT", "UTC")
      .replace(/^UTC\+0$/, "UTC"),
  };
}

const optionsCache = new Map<string, TimeZoneOption[]>();

// Building ~400 options is slow, and the same list is asked for after every save.
export function timeZoneOptions(
  locale: Locale,
  now: Date,
  include: readonly string[],
): TimeZoneOption[] {
  const key = [
    locale,
    now.toISOString().slice(0, 10),
    ...[...include].sort(),
  ].join("|");
  const cached = optionsCache.get(key);
  if (cached) return cached;

  const ids = new Set(
    [...Intl.supportedValuesOf("timeZone"), ...include].map(canonicalTimeZone),
  );
  const options = [...ids]
    .map((id) => timeZoneOption(id, locale, now))
    .sort(
      (a, b) =>
        offsetMinutes(a.offset) - offsetMinutes(b.offset) ||
        a.city.localeCompare(b.city, "en"),
    );
  optionsCache.set(key, options);
  return options;
}

export function searchTimeZones(
  options: readonly TimeZoneOption[],
  query: string,
): TimeZoneOption[] {
  const needle = query.trim().toLowerCase();
  return options.filter((option) =>
    [option.id, option.city, option.region, option.country].some((field) =>
      field.toLowerCase().includes(needle),
    ),
  );
}
