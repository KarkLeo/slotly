"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/db/server";
import { isValidSlug } from "@/domain/slugs";
import { locales } from "@/i18n/locales";
import { requireMaster } from "@/master-cabinet/session";
import type { ActionToast, ToastKey } from "@/toasts/toast";
import { canonicalTimeZone } from "./time-zones";
import { currencies } from "./view";

export type SettingsFieldError =
  "nameInvalid" | "slugInvalid" | "slugTaken" | "slugLocked";

export type SettingsActionState = {
  toast?: ActionToast;
  fieldError?: SettingsFieldError;
};

export type SlugCheck = "current" | "available" | "taken" | "invalid";

const unexpected: SettingsActionState = {
  toast: { type: "error", key: "unexpected" },
};

const nameSchema = z.string().trim().min(1).max(100);
const slugSchema = z.string().trim().toLowerCase();
const localeSchema = z.enum(locales);
const currencySchema = z.enum(currencies);

const localesSchema = z
  .object({
    locales: z.array(localeSchema).min(1),
    primaryLocale: localeSchema,
  })
  .refine(
    ({ locales: enabled, primaryLocale }) =>
      new Set(enabled).size === enabled.length &&
      enabled.includes(primaryLocale),
  );

function saved(
  error: { message: string } | null,
  success: ToastKey,
): SettingsActionState {
  if (error) return unexpected;
  refresh();
  return { toast: { type: "success", key: success } };
}

export async function updateName(
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const name = nameSchema.safeParse(formData.get("name"));
  if (!name.success) return { fieldError: "nameInvalid" };

  const user = await requireMaster();
  const { error } = await (
    await createClient()
  )
    .from("masters")
    .update({ name: name.data })
    .eq("id", user.id);
  return saved(error, "settingsSaved");
}

export async function changeSlug(
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const slug = slugSchema.safeParse(formData.get("slug"));
  if (!slug.success || !isValidSlug(slug.data))
    return { fieldError: "slugInvalid" };

  const user = await requireMaster();
  const { error } = await (
    await createClient()
  )
    .from("masters")
    .update({ slug: slug.data })
    .eq("id", user.id);

  if (error?.message === "slug_taken" || error?.code === "23505")
    return { fieldError: "slugTaken" };
  if (error?.message === "slug_change_locked") {
    // The limit flipped between render and tap; the screen shows the locked state.
    refresh();
    return { fieldError: "slugLocked" };
  }
  return saved(error, "slugChanged");
}

export async function updateLocales(
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const input = localesSchema.safeParse({
    locales: formData.getAll("locales"),
    primaryLocale: formData.get("primaryLocale"),
  });
  if (!input.success) return unexpected;

  const user = await requireMaster();
  const { error } = await (
    await createClient()
  )
    .from("masters")
    .update({
      locales: input.data.locales,
      primary_locale: input.data.primaryLocale,
    })
    .eq("id", user.id);
  return saved(error, "settingsSaved");
}

export async function updateTimeZone(
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const timeZone = z.string().min(1).safeParse(formData.get("timeZone"));
  if (!timeZone.success) return unexpected;

  const user = await requireMaster();
  const { error } = await (
    await createClient()
  )
    .from("masters")
    .update({ timezone: canonicalTimeZone(timeZone.data) })
    .eq("id", user.id);
  return saved(error, "settingsSaved");
}

export async function updateCurrency(
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const currency = currencySchema.safeParse(formData.get("currency"));
  if (!currency.success) return unexpected;

  const user = await requireMaster();
  const { error } = await (
    await createClient()
  )
    .from("masters")
    .update({ currency: currency.data })
    .eq("id", user.id);
  return saved(error, "settingsSaved");
}

export async function setPublished(
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const published = z
    .enum(["true", "false"])
    .safeParse(formData.get("published"));
  if (!published.success) return unexpected;

  const user = await requireMaster();
  const supabase = await createClient();

  if (published.data === "false") {
    const { error } = await supabase
      .from("masters")
      .update({ published_at: null })
      .eq("id", user.id);
    return saved(error, "pageUnpublished");
  }

  // A page that was never published goes live through onboarding, not here.
  const { data, error } = await supabase
    .from("masters")
    .update({ published_at: new Date().toISOString() })
    .eq("id", user.id)
    .not("first_published_at", "is", null)
    .select("id");
  if (!data?.length) return unexpected;
  return saved(error, "pagePublished");
}

export async function checkSlug(slug: string): Promise<SlugCheck> {
  if (!isValidSlug(slug)) return "invalid";

  const user = await requireMaster();
  const supabase = await createClient();
  const master = await supabase
    .from("masters")
    .select("slug")
    .eq("id", user.id)
    .maybeSingle();
  if (master.error) throw master.error;
  if (master.data?.slug === slug) return "current";

  const { data, error } = await supabase.rpc("is_slug_available", { slug });
  if (error) throw error;
  return data ? "available" : "taken";
}
