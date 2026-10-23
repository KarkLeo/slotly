import type { Database } from "@/db/types";
import type { Locale } from "@/i18n/locales";
import type { LocalizedText } from "./localize";
import type { Category, Service } from "./services";

export type Landing = {
  id: string;
  slug: string;
  name: string;
  primaryLocale: Locale;
  locales: Locale[];
  currency: string;
  timeZone: string;
  horizonDays: number;
  cancelDeadlineMinutes: number;
  published: boolean;
  categories: Category[];
  services: Service[];
};

type Tables = Database["public"]["Tables"];
type MasterRow = Pick<
  Tables["masters"]["Row"],
  | "id"
  | "slug"
  | "name"
  | "primary_locale"
  | "locales"
  | "currency"
  | "timezone"
  | "horizon_days"
  | "cancel_deadline_minutes"
  | "published_at"
> & {
  service_categories: Pick<
    Tables["service_categories"]["Row"],
    "id" | "position" | "name"
  >[];
  services: Pick<
    Tables["services"]["Row"],
    | "id"
    | "category_id"
    | "position"
    | "name"
    | "description"
    | "duration_minutes"
    | "price_kind"
    | "price"
    | "format"
    | "archived_at"
  >[];
};

export function toLanding(row: MasterRow): Landing {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    primaryLocale: row.primary_locale,
    locales: row.locales,
    currency: row.currency,
    timeZone: row.timezone,
    horizonDays: row.horizon_days,
    cancelDeadlineMinutes: row.cancel_deadline_minutes,
    published: row.published_at !== null,
    categories: row.service_categories.map((category) => ({
      id: category.id,
      position: category.position,
      name: category.name as LocalizedText,
    })),
    // The master sees own archived services through RLS; the landing never shows them.
    services: row.services
      .filter((service) => service.archived_at === null)
      .map((service) => ({
        id: service.id,
        categoryId: service.category_id,
        position: service.position,
        name: service.name as LocalizedText,
        description: service.description as LocalizedText,
        durationMinutes: service.duration_minutes,
        priceKind: service.price_kind,
        price: service.price,
        format: service.format,
      })),
  };
}
