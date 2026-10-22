import type { Locale } from "@/i18n/locales";

export type LocalizedText = Partial<Record<Locale, string>>;

export function localize(
  text: LocalizedText,
  locale: Locale,
  primary: Locale,
): string {
  return text[locale] ?? text[primary] ?? Object.values(text)[0] ?? "";
}
