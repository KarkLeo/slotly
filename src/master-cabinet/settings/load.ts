import "server-only";
import { createClient } from "@/db/server";
import type { Locale } from "@/i18n/locales";

export type SettingsData = {
  name: string;
  slug: string;
  retiredSlugs: string[];
  primaryLocale: Locale;
  locales: Locale[];
  timeZone: string;
  currency: string;
  published: boolean;
  everPublished: boolean;
  slugPolicy: {
    limited: boolean;
    nextChangeAt: string | null;
    changesLeft: number;
  };
};

export async function loadSettings(masterId: string): Promise<SettingsData> {
  const supabase = await createClient();
  const [master, retired, policy] = await Promise.all([
    supabase
      .from("masters")
      .select(
        "name, slug, primary_locale, locales, timezone, currency, published_at, first_published_at",
      )
      .eq("id", masterId)
      .maybeSingle(),
    supabase
      .from("retired_slugs")
      .select("slug")
      .order("retired_at", { ascending: false }),
    supabase.rpc("get_slug_policy"),
  ]);
  if (master.error) throw master.error;
  if (!master.data) throw new Error("Master not found");
  if (retired.error) throw retired.error;
  if (policy.error) throw policy.error;
  const row = policy.data[0];
  if (!row) throw new Error("Slug policy not found");

  return {
    name: master.data.name,
    slug: master.data.slug,
    retiredSlugs: retired.data.map((r) => r.slug),
    primaryLocale: master.data.primary_locale,
    locales: master.data.locales,
    timeZone: master.data.timezone,
    currency: master.data.currency,
    published: master.data.published_at !== null,
    everPublished: master.data.first_published_at !== null,
    slugPolicy: {
      limited: row.limited,
      nextChangeAt: row.next_change_at as string | null,
      changesLeft: row.changes_left,
    },
  };
}
