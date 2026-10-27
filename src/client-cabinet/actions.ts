"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/db/server";
import { setFlash } from "@/toasts/flash";
import type { ActionToast, ToastKey } from "@/toasts/toast";
import { bookingPath } from "./view";

export type CancelBookingState = { toast?: ActionToast };

const cancelSchema = z.object({
  appointmentId: z.uuid(),
  comment: z.string().trim().max(500),
});

// What the client can no longer do once the booking changed under them; the page then shows why.
const refusals: Record<string, ToastKey> = {
  cancel_deadline_passed: "changeClosed",
  appointment_not_active: "bookingNotActive",
  appointment_not_found: "bookingNotActive",
  service_not_found: "rescheduleClosed",
};

export async function cancelBooking(
  _state: CancelBookingState,
  formData: FormData,
): Promise<CancelBookingState> {
  const input = cancelSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    comment: formData.get("comment") ?? "",
  });
  if (!input.success) return { toast: { type: "error", key: "unexpected" } };

  const { error } = await (
    await createClient()
  ).rpc("cancel_appointment", {
    appointment_id: input.data.appointmentId,
    comment: input.data.comment || undefined,
  });
  const refusal = error && refusals[error.message];
  if (refusal) {
    refresh();
    return { toast: { type: "error", key: refusal } };
  }
  if (error) return { toast: { type: "error", key: "unexpected" } };

  await setFlash({ type: "success", key: "bookingCancelled" });
  redirect("/app/bookings");
}

export type RescheduleBookingResult =
  { status: "slotTaken" } | { status: "failed"; toast: ActionToast };

const rescheduleSchema = z.object({
  appointmentId: z.uuid(),
  startsAt: z.iso.datetime({ offset: true }),
});

export async function rescheduleBooking(request: {
  appointmentId: string;
  startsAt: string;
}): Promise<RescheduleBookingResult> {
  const input = rescheduleSchema.safeParse(request);
  if (!input.success)
    return { status: "failed", toast: { type: "error", key: "unexpected" } };

  const { data, error } = await (
    await createClient()
  ).rpc("reschedule_booking", {
    appointment_id: input.data.appointmentId,
    starts_at: input.data.startsAt,
  });
  if (error?.message === "slot_unavailable") return { status: "slotTaken" };
  const refusal = error && refusals[error.message];
  if (refusal) {
    await setFlash({ type: "error", key: refusal });
    redirect(bookingPath(input.data.appointmentId));
  }
  if (error)
    return { status: "failed", toast: { type: "error", key: "unexpected" } };

  await setFlash({
    type: "success",
    key: data === "pending" ? "rescheduleRequested" : "bookingRescheduled",
  });
  redirect(bookingPath(input.data.appointmentId));
}
