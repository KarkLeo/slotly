import "server-only";
import { cache } from "react";
import { createClient } from "@/db/server";
import { isValidSlug } from "@/domain/slugs";
import { toLanding, type Landing } from "./landing";

export const getLanding = cache(
  async (slug: string): Promise<Landing | null> => {
    if (!isValidSlug(slug)) return null;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("masters")
      .select(
        "id, slug, name, primary_locale, locales, currency, timezone, horizon_days, cancel_deadline_minutes, published_at, service_categories (id, position, name), services (id, category_id, position, name, description, duration_minutes, price_kind, price, format, archived_at)",
      )
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data ? toLanding(data) : null;
  },
);
