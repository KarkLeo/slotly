import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import {
  isLocale,
  localeCookie,
  negotiateLocale,
  type Locale,
} from "./locales";

async function resolveLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(localeCookie)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  return negotiateLocale((await headers()).get("accept-language"));
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
