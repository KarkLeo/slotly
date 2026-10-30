"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/db/server";
import type { ActionToast, ToastKey } from "@/toasts/toast";

export type AppointmentActionState = { toast?: ActionToast };

const confirmSchema = z.object({ appointmentId: z.uuid() });

const cancelSchema = z.object({
  appointmentId: z.uuid(),
  comment: z.string().trim().max(500),
  variant: z.enum(["decline"]),
});

// The appointment changed or expired between render and tap; the screen then shows its real state.
const refusals: Record<string, ToastKey> = {
  appointment_expired: "decisionExpired",
  appointment_not_awaiting_master: "appointmentChanged",
  appointment_not_active: "appointmentChanged",
  appointment_not_found: "appointmentChanged",
};

function outcome(
  error: { message: string } | null,
  success: ToastKey,
): AppointmentActionState {
  const refusal = error && refusals[error.message];
  if (refusal) {
    refresh();
    return { toast: { type: "error", key: refusal } };
  }
  if (error) return { toast: { type: "error", key: "unexpected" } };
  refresh();
  return { toast: { type: "success", key: success } };
}

export async function confirmAppointment(
  _state: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  const input = confirmSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
  });
  if (!input.success) return { toast: { type: "error", key: "unexpected" } };

  const { error } = await (
    await createClient()
  ).rpc("confirm_appointment", { appointment_id: input.data.appointmentId });
  return outcome(error, "appointmentConfirmed");
}

export async function cancelAppointment(
  _state: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  const input = cancelSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    comment: formData.get("comment") ?? "",
    variant: formData.get("variant"),
  });
  if (!input.success) return { toast: { type: "error", key: "unexpected" } };

  const { error } = await (
    await createClient()
  ).rpc("cancel_appointment", {
    appointment_id: input.data.appointmentId,
    comment: input.data.comment || undefined,
  });
  return outcome(error, "appointmentDeclined");
}
