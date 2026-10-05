import { locales } from "@/i18n/locales";

export const reservedSlugs: ReadonlySet<string> = new Set([
  ...locales,
  "about",
  "account",
  "admin",
  "api",
  "app",
  "assets",
  "auth",
  "blog",
  "book",
  "booking",
  "contact",
  "dashboard",
  "docs",
  "help",
  "health",
  "legal",
  "login",
  "logout",
  "mcp",
  "me",
  "new",
  "oauth",
  "preview",
  "pricing",
  "privacy",
  "register",
  "settings",
  "signup",
  "slotly",
  "static",
  "status",
  "support",
  "terms",
  "www",
]);

export function isReservedSlug(slug: string): boolean {
  return reservedSlugs.has(slug.toLowerCase());
}
