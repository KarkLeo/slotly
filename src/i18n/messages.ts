import type { Locale } from "./locales";

// The error screen texts live apart so the root error screen can bundle them without the whole dictionary.
export async function loadMessages(locale: Locale) {
  const [messages, errors] = await Promise.all([
    import(`../../messages/${locale}.json`),
    import(`../../messages/errors/${locale}.json`),
  ]);
  return { ...messages.default, Errors: errors.default };
}
