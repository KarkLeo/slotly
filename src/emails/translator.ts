import { createTranslator } from "next-intl";
import type { Locale } from "@/i18n/locales";
import type messages from "../../messages/emails/en.json";

export type Translate = ReturnType<typeof createTranslator<typeof messages>>;

export async function translator(locale: Locale): Promise<Translate> {
  const { default: dictionary } = (await import(
    `../../messages/emails/${locale}.json`
  )) as { default: typeof messages };
  return createTranslator({ locale, messages: dictionary });
}
