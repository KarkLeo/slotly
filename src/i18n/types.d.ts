import type messages from "../../messages/en.json";
import type errors from "../../messages/errors/en.json";
import type { Locale } from "./locales";

declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages & { Errors: typeof errors };
  }
}
