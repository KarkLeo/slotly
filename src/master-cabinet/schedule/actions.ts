"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/db/server";
import { requireMaster } from "@/master-cabinet/session";
import type { ActionToast, ToastKey } from "@/toasts/toast";
import { areValidIntervals, parseHours } from "./hours";
import type { ParamKey } from "./view";

export type ScheduleActionState = {
  toast?: ActionToast;
  fieldError?: "intervalsInvalid";
  submittedHours?: string;
};

const unexpected: ScheduleActionState = {
  toast: { type: "error", key: "unexpected" },
};

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const hoursSchema = z.string().refine((value) => parseHours(value) !== null);
const weekdaysSchema = z
  .array(z.coerce.number().int().min(1).max(7))
  .min(1)
  .refine((weekdays) => new Set(weekdays).size === weekdays.length);

const paramColumns = {
  step: "slot_step_minutes",
  notice: "min_notice_minutes",
  horizon: "horizon_days",
  deadline: "cancel_deadline_minutes",
} as const satisfies Record<ParamKey, string>;

const paramSchema = z.object({
  key: z.enum(["step", "notice", "horizon", "deadline"]),
  value: z.string().regex(/^\d+$/).pipe(z.coerce.number()),
});

function saved(
  error: { message: string } | null,
  success: ToastKey = "settingsSaved",
): ScheduleActionState {
  if (error) return unexpected;
  refresh();
  return { toast: { type: "success", key: success } };
}

function hasValidIntervals(hours: string): boolean {
  return areValidIntervals(parseHours(hours) ?? []);
}

export async function saveTemplateDays(
  _state: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const weekdays = weekdaysSchema.safeParse(formData.getAll("weekdays"));
  const hours = hoursSchema.safeParse(formData.get("hours"));
  if (!weekdays.success || !hours.success) return unexpected;
  if (!hasValidIntervals(hours.data))
    return { fieldError: "intervalsInvalid", submittedHours: hours.data };

  await requireMaster();
  const { error } = await (
    await createClient()
  ).rpc("set_work_template_days", {
    weekdays: weekdays.data,
    hours: hours.data,
  });
  return saved(error);
}

const exceptionSchema = z.object({
  kind: z.enum(["off", "hours"]),
  from: dateSchema,
  to: dateSchema,
  hours: hoursSchema.optional(),
  replacedFrom: dateSchema.optional(),
  replacedTo: dateSchema.optional(),
});

export async function saveException(
  _state: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const optional = (name: string) => formData.get(name) || undefined;
  const input = exceptionSchema.safeParse({
    kind: formData.get("kind"),
    from: formData.get("from"),
    to: formData.get("to"),
    hours: optional("hours"),
    replacedFrom: optional("replacedFrom"),
    replacedTo: optional("replacedTo"),
  });
  if (
    !input.success ||
    (input.data.replacedFrom === undefined) !==
      (input.data.replacedTo === undefined)
  )
    return unexpected;

  const { kind, from, to, replacedFrom, replacedTo } = input.data;
  if (kind === "hours") {
    const hours = input.data.hours ?? "{}";
    const intervals = parseHours(hours) ?? [];
    if (intervals.length === 0 || !areValidIntervals(intervals))
      return { fieldError: "intervalsInvalid", submittedHours: hours };
  }

  await requireMaster();
  const { error } = await (
    await createClient()
  ).rpc("set_schedule_exceptions", {
    from_date: from,
    to_date: to,
    hours: kind === "off" ? "{}" : (input.data.hours as string),
    ...(replacedFrom !== undefined && { replaced_from: replacedFrom }),
    ...(replacedTo !== undefined && { replaced_to: replacedTo }),
  });
  return saved(error);
}

export async function deleteException(
  _state: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const range = z
    .object({ from: dateSchema, to: dateSchema })
    .safeParse({ from: formData.get("from"), to: formData.get("to") });
  if (!range.success) return unexpected;

  const user = await requireMaster();
  const { error } = await (
    await createClient()
  )
    .from("schedule_exceptions")
    .delete()
    .eq("master_id", user.id)
    .gte("day", range.data.from)
    .lte("day", range.data.to);
  return saved(error, "exceptionDeleted");
}

export async function updateBookingParam(
  _state: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const input = paramSchema.safeParse({
    key: formData.get("key"),
    value: formData.get("value"),
  });
  if (!input.success) return unexpected;

  const user = await requireMaster();
  const { error } = await (
    await createClient()
  )
    .from("masters")
    .update({ [paramColumns[input.data.key]]: input.data.value } as Record<
      (typeof paramColumns)[ParamKey],
      number
    >)
    .eq("id", user.id);
  return saved(error);
}

export async function setAutoConfirm(
  _state: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const autoConfirm = z
    .enum(["true", "false"])
    .safeParse(formData.get("autoConfirm"));
  if (!autoConfirm.success) return unexpected;

  const user = await requireMaster();
  const { error } = await (
    await createClient()
  )
    .from("masters")
    .update({ auto_confirm: autoConfirm.data === "true" })
    .eq("id", user.id);
  return saved(error);
}
