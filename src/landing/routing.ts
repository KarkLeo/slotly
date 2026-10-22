import { isValidSlug } from "@/domain/slugs";
import { isLocale, type Locale } from "@/i18n/locales";

type LandingLocales = {
  primaryLocale: Locale;
  locales: readonly Locale[];
};

export type LandingLocaleResult =
  | { kind: "page"; locale: Locale }
  | { kind: "redirect" }
  | { kind: "notFound" };

// The primary language lives at /<slug>, every other enabled one at /<slug>/<locale>.
export function resolveLandingLocale(
  segments: readonly string[] | undefined,
  master: LandingLocales,
): LandingLocaleResult {
  if (!segments || segments.length === 0) {
    return { kind: "page", locale: master.primaryLocale };
  }
  const [segment] = segments;
  if (segments.length > 1 || !isLocale(segment)) return { kind: "notFound" };
  if (segment === master.primaryLocale) return { kind: "redirect" };
  if (!master.locales.includes(segment)) return { kind: "notFound" };
  return { kind: "page", locale: segment };
}

export function landingPath(
  slug: string,
  locale: Locale,
  primary: Locale,
): string {
  return locale === primary ? `/${slug}` : `/${slug}/${locale}`;
}

export type LandingSlugResult =
  { kind: "page" } | { kind: "redirect"; slug: string } | { kind: "notFound" };

// Paths that can never be a slug (robots.txt, reserved words) skip the database.
export function resolveLandingSlug(slug: string): LandingSlugResult {
  if (isValidSlug(slug)) return { kind: "page" };
  const lower = slug.toLowerCase();
  return isValidSlug(lower)
    ? { kind: "redirect", slug: lower }
    : { kind: "notFound" };
}
