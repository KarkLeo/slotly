"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/db/server";
import type { LocalizedText } from "@/landing/localize";
import { requireMaster } from "@/master-cabinet/session";
import type { ActionToast, ToastKey } from "@/toasts/toast";
import { parseCategoryForm, parseServiceForm, type ServiceField } from "./form";

export type ServiceActionState = {
  toast?: ActionToast;
  errors?: ServiceField[];
};

export type CategoryActionState = {
  toast?: ActionToast;
  error?: "name";
};

export type ReorderResult = { toast?: ActionToast };

const unexpected = { toast: { type: "error", key: "unexpected" } } as const;

const idSchema = z.guid();
const idsSchema = z.array(idSchema).min(1);

function saved(success: ToastKey) {
  refresh();
  return { toast: { type: "success" as const, key: success } };
}

// The form's id field: absent for a new row, malformed only when tampered with.
function readId(formData: FormData): string | null | undefined {
  const raw = formData.get("id");
  if (raw === null || raw === "") return null;
  const id = idSchema.safeParse(raw);
  return id.success ? id.data : undefined;
}

async function loadLocales(masterId: string) {
  const { data, error } = await (
    await createClient()
  )
    .from("masters")
    .select("locales, primary_locale")
    .eq("id", masterId)
    .maybeSingle();
  if (error || !data) return null;
  return { locales: data.locales, primaryLocale: data.primary_locale };
}

export async function saveService(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const id = readId(formData);
  if (id === undefined) return unexpected;

  const user = await requireMaster();
  const supabase = await createClient();
  const context = await loadLocales(user.id);
  if (!context) return unexpected;

  const current = id
    ? await supabase
        .from("services")
        .select("name, description, category_id")
        .eq("id", id)
        .eq("master_id", user.id)
        .maybeSingle()
    : null;
  if (current && !current.data) return unexpected;

  const parsed = parseServiceForm(formData, {
    ...context,
    existing: {
      name: (current?.data?.name ?? {}) as LocalizedText,
      description: (current?.data?.description ?? {}) as LocalizedText,
    },
  });
  if (parsed.errors) return { errors: parsed.errors };
  if (!parsed.values) return unexpected;

  const { categoryId, durationMinutes, bufferMinutes, priceKind, ...rest } =
    parsed.values;
  const row = {
    ...rest,
    category_id: categoryId,
    duration_minutes: durationMinutes,
    buffer_minutes: bufferMinutes,
    price_kind: priceKind,
  };

  // A new service, or one moved to another category, goes to the end of its list.
  const position =
    !current?.data || current.data.category_id !== categoryId
      ? await nextServicePosition(user.id, categoryId)
      : undefined;
  if (position === null) return unexpected;

  if (id) {
    const { error } = await supabase
      .from("services")
      .update({ ...row, position })
      .eq("id", id)
      .eq("master_id", user.id);
    return error ? unexpected : saved("settingsSaved");
  }

  const { error } = await supabase
    .from("services")
    .insert({ ...row, position, master_id: user.id });
  return error ? unexpected : saved("serviceAdded");
}

async function nextServicePosition(
  masterId: string,
  categoryId: string | null,
): Promise<number | null> {
  const supabase = await createClient();
  const query = supabase
    .from("services")
    .select("position")
    .eq("master_id", masterId)
    .order("position", { ascending: false })
    .limit(1);
  const { data, error } = await (categoryId
    ? query.eq("category_id", categoryId)
    : query.is("category_id", null));
  if (error) return null;
  return (data[0]?.position ?? -1) + 1;
}

async function setArchived(
  formData: FormData,
  archivedAt: string | null,
  success: ToastKey,
): Promise<ServiceActionState> {
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return unexpected;

  const user = await requireMaster();
  const { data, error } = await (
    await createClient()
  )
    .from("services")
    .update({ archived_at: archivedAt })
    .eq("id", id.data)
    .eq("master_id", user.id)
    .select("id");
  return error || !data.length ? unexpected : saved(success);
}

export async function archiveService(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  return setArchived(formData, new Date().toISOString(), "serviceArchived");
}

export async function restoreService(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  return setArchived(formData, null, "serviceRestored");
}

export async function saveCategory(
  _state: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const id = readId(formData);
  if (id === undefined) return unexpected;

  const user = await requireMaster();
  const supabase = await createClient();
  const context = await loadLocales(user.id);
  if (!context) return unexpected;

  const current = id
    ? await supabase
        .from("service_categories")
        .select("name")
        .eq("id", id)
        .eq("master_id", user.id)
        .maybeSingle()
    : null;
  if (current && !current.data) return unexpected;

  const parsed = parseCategoryForm(formData, {
    ...context,
    existing: (current?.data?.name ?? {}) as LocalizedText,
  });
  if ("error" in parsed) return { error: parsed.error };

  if (id) {
    const { error } = await supabase
      .from("service_categories")
      .update({ name: parsed.name })
      .eq("id", id)
      .eq("master_id", user.id);
    return error ? unexpected : saved("settingsSaved");
  }

  const last = await supabase
    .from("service_categories")
    .select("position")
    .eq("master_id", user.id)
    .order("position", { ascending: false })
    .limit(1);
  if (last.error) return unexpected;

  const { error } = await supabase.from("service_categories").insert({
    master_id: user.id,
    name: parsed.name,
    position: (last.data[0]?.position ?? -1) + 1,
  });
  return error ? unexpected : saved("categoryAdded");
}

export async function deleteCategory(
  _state: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return unexpected;

  const user = await requireMaster();
  const { data, error } = await (
    await createClient()
  )
    .from("service_categories")
    .delete()
    .eq("id", id.data)
    .eq("master_id", user.id)
    .select("id");
  return error || !data.length ? unexpected : saved("categoryDeleted");
}

async function reorder(
  fn: "reorder_services" | "reorder_service_categories",
  ids: string[],
): Promise<ReorderResult> {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return unexpected;

  await requireMaster();
  const { error } = await (await createClient()).rpc(fn, { ids: parsed.data });
  if (error) return unexpected;
  refresh();
  return {};
}

export async function reorderServices(ids: string[]): Promise<ReorderResult> {
  return reorder("reorder_services", ids);
}

export async function reorderCategories(ids: string[]): Promise<ReorderResult> {
  return reorder("reorder_service_categories", ids);
}
