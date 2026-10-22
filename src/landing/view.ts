import type { Locale } from "@/i18n/locales";
import { formatDuration, formatMoney, initials } from "./format";
import type { Landing } from "./landing";
import { localize } from "./localize";
import { landingPath } from "./routing";
import { groupServices, type Service } from "./services";

export type ServiceView = {
  id: string;
  name: string;
  description: string;
  duration: string;
  price: { kind: Service["priceKind"]; amount: string | null };
  format: Service["format"];
};

export type LandingView = {
  name: string;
  initials: string;
  published: boolean;
  specialties: string[];
  languages: { locale: Locale; name: string; href: string; current: boolean }[];
  groups: {
    id: string | null;
    title: string | null;
    services: ServiceView[];
  }[];
  services: ServiceView[];
};

export function toLandingView(landing: Landing, locale: Locale): LandingView {
  const text = (value: Parameters<typeof localize>[0]) =>
    localize(value, locale, landing.primaryLocale);

  const service = (s: Service): ServiceView => ({
    id: s.id,
    name: text(s.name),
    description: text(s.description),
    duration: formatDuration(s.durationMinutes, locale),
    price: {
      kind: s.priceKind,
      amount:
        s.price === null
          ? null
          : formatMoney(s.price, landing.currency, locale),
    },
    format: s.format,
  });

  const groups = groupServices(landing.categories, landing.services).map(
    (group) => ({
      id: group.category?.id ?? null,
      title: group.category ? text(group.category.name) : null,
      services: group.services.map(service),
    }),
  );
  const services = groups.flatMap((group) => group.services);

  return {
    name: landing.name,
    initials: initials(landing.name),
    published: landing.published,
    specialties: groups.flatMap((group) => (group.title ? [group.title] : [])),
    languages:
      landing.locales.length > 1
        ? landing.locales.map((code) => ({
            locale: code,
            name: languageName(code),
            href: landingPath(landing.slug, code, landing.primaryLocale),
            current: code === locale,
          }))
        : [],
    groups,
    services,
  };
}

// Each language is named in itself, so a visitor finds their own.
function languageName(locale: Locale): string {
  return (
    new Intl.DisplayNames(locale, { type: "language" }).of(locale) ?? locale
  );
}
