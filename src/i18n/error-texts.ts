import en from "../../messages/errors/en.json";
import ru from "../../messages/errors/ru.json";
import uk from "../../messages/errors/uk.json";
import type { Locale } from "./locales";

const texts = { uk, ru, en };

export function errorTexts(locale: Locale) {
  return texts[locale];
}
