import { cookies, headers } from "next/headers";
import {
  isLocale,
  localeCookie,
  negotiateLocale,
  type Locale,
} from "./locales";
import { loadMessages } from "./messages";

async function interfaceLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(localeCookie)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  return negotiateLocale((await headers()).get("accept-language"));
}

// Landings set their content language for the request; other pages use the visitor's interface language.
export async function requestConfig({
  locale,
  requestLocale,
}: {
  locale?: string;
  requestLocale: Promise<string | undefined>;
}) {
  const fromRoute = await requestLocale;
  const resolved = isLocale(locale)
    ? locale
    : isLocale(fromRoute)
      ? fromRoute
      : await interfaceLocale();
  return {
    locale: resolved,
    messages: await loadMessages(resolved),
  };
}
