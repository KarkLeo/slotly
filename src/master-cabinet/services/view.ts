import type { Locale } from "@/i18n/locales";
import { formatDuration, formatMoney } from "@/landing/format";
import { localize } from "@/landing/localize";
import { type Category, groupServices, type Service } from "@/landing/services";
import { currencySymbol, endonym } from "../settings/view";

export type ServiceData = Service & {
  bufferMinutes: number;
  archived: boolean;
};

export type ServicesData = {
  currency: string;
  primaryLocale: Locale;
  locales: Locale[];
  categories: Category[];
  services: ServiceData[];
};

export type ServiceItem = ServiceData & {
  title: string;
  duration: string;
  buffer: string | null;
  amount: string | null;
};

export type CategoryItem = Category & {
  title: string;
  serviceCount: number;
};

export type ServiceGroupView = {
  id: string | null;
  title: string | null;
  services: ServiceItem[];
};

export type LanguageOption = { locale: Locale; label: string };

export type ServicesView = {
  currency: string;
  languages: LanguageOption[];
  categories: CategoryItem[];
  groups: ServiceGroupView[];
  archived: ServiceItem[];
};

export function toServicesView(
  data: ServicesData,
  locale: Locale,
): ServicesView {
  const title = (text: Service["name"]) =>
    localize(text, locale, data.primaryLocale);
  const item = (service: ServiceData): ServiceItem => ({
    ...service,
    title: title(service.name),
    duration: formatDuration(service.durationMinutes, locale),
    buffer: service.bufferMinutes
      ? formatDuration(service.bufferMinutes, locale)
      : null,
    amount:
      service.price === null
        ? null
        : formatMoney(service.price, data.currency, locale),
  });
  const active = data.services.filter((service) => !service.archived);

  return {
    currency: currencySymbol(data.currency, locale) ?? data.currency,
    languages: [
      data.primaryLocale,
      ...data.locales.filter((l) => l !== data.primaryLocale),
    ].map((l) => ({ locale: l, label: endonym(l) })),
    categories: [...data.categories]
      .sort((a, b) => a.position - b.position)
      .map((category) => ({
        ...category,
        title: title(category.name),
        serviceCount: active.filter((s) => s.categoryId === category.id).length,
      })),
    groups: groupServices(data.categories, active).map((group) => ({
      id: group.category?.id ?? null,
      title: group.category ? title(group.category.name) : null,
      services: group.services.map(item),
    })),
    archived: data.services
      .filter((service) => service.archived)
      .sort((a, b) => a.position - b.position)
      .map(item),
  };
}
