import { locales } from "@/i18n/locales";

// Mirrors private.is_valid_slug in the database, which has the final say.
export const reservedSlugs: ReadonlySet<string> = new Set([
  ...locales,
  "about",
  "account",
  "admin",
  "agent",
  "agents",
  "api",
  "app",
  "apps",
  "assets",
  "auth",
  "blog",
  "book",
  "booking",
  "bookings",
  "callback",
  "client",
  "clients",
  "contact",
  "dashboard",
  "docs",
  "faq",
  "favicon",
  "health",
  "help",
  "home",
  "legal",
  "login",
  "logout",
  "master",
  "masters",
  "mcp",
  "me",
  "new",
  "oauth",
  "onboarding",
  "pricing",
  "privacy",
  "profile",
  "register",
  "robots",
  "security",
  "settings",
  "signin",
  "signup",
  "sitemap",
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

export function isValidSlug(slug: string): boolean {
  return (
    /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(slug) &&
    slug.length >= 3 &&
    slug.length <= 40 &&
    !isReservedSlug(slug)
  );
}
