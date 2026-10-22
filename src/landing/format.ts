import type { Locale } from "@/i18n/locales";

export function formatDuration(minutes: number, locale: Locale): string {
  return new Intl.DurationFormat(locale, { style: "short" }).format({
    hours: Math.floor(minutes / 60),
    minutes: minutes % 60,
  });
}

export function formatMoney(
  amount: number,
  currency: string,
  locale: Locale,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}
