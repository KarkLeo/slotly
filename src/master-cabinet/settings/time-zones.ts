import type { Locale } from "@/i18n/locales";

export type TimeZoneOption = {
  id: string;
  city: string;
  region: string;
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

export function timeZoneOption(
  id: string,
  locale: Locale,
  now: Date,
): TimeZoneOption {
  return {
    id,
    city: (id.split("/").at(-1) ?? id).replaceAll("_", " "),
    region: zoneName(id, locale, "longGeneric", now),
    offset: zoneName(id, "en", "shortOffset", now)
      .replace("GMT", "UTC")
      .replace(/^UTC\+0$/, "UTC"),
  };
}

export function timeZoneOptions(
  locale: Locale,
  now: Date,
  include: readonly string[],
): TimeZoneOption[] {
  const ids = new Set(
    [...Intl.supportedValuesOf("timeZone"), ...include].map(canonicalTimeZone),
  );
  return [...ids]
    .map((id) => timeZoneOption(id, locale, now))
    .sort(
      (a, b) =>
        offsetMinutes(a.offset) - offsetMinutes(b.offset) ||
        a.city.localeCompare(b.city),
    );
}

export function searchTimeZones(
  options: readonly TimeZoneOption[],
  query: string,
): TimeZoneOption[] {
  const needle = query.trim().toLowerCase();
  return options.filter((option) =>
    [option.id, option.city, option.region].some((field) =>
      field.toLowerCase().includes(needle),
    ),
  );
}
