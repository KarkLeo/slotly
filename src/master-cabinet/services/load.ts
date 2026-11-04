import "server-only";
import { createClient } from "@/db/server";
import type { LocalizedText } from "@/landing/localize";
import type { ServicesData } from "./view";

export async function loadServices(masterId: string): Promise<ServicesData> {
  const { data, error } = await (
    await createClient()
  )
    .from("masters")
    .select(
      "currency, primary_locale, locales, service_categories (id, position, name), services (id, category_id, position, name, description, duration_minutes, buffer_minutes, price_kind, price, format, archived_at)",
    )
    .eq("id", masterId)
    .order("created_at", { referencedTable: "service_categories" })
    .order("created_at", { referencedTable: "services" })
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Master not found");

  return {
    currency: data.currency,
    primaryLocale: data.primary_locale,
    locales: data.locales,
    categories: data.service_categories.map((category) => ({
      id: category.id,
      position: category.position,
      name: category.name as LocalizedText,
    })),
    services: data.services.map((service) => ({
      id: service.id,
      categoryId: service.category_id,
      position: service.position,
      name: service.name as LocalizedText,
      description: service.description as LocalizedText,
      durationMinutes: service.duration_minutes,
      bufferMinutes: service.buffer_minutes,
      priceKind: service.price_kind,
      price: service.price,
      format: service.format,
      archived: service.archived_at !== null,
    })),
  };
}
