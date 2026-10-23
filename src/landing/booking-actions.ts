"use server";

import { isWrongCode, otpFailureToast } from "@/auth/otp-errors";
import { createClient } from "@/db/server";
import { isLocale } from "@/i18n/locales";
import type { ActionToast } from "@/toasts/toast";

export type BookingRequest = {
  serviceId: string;
  slot: string;
  name: string;
  email: string;
  address: string;
  locale: string;
  replaces?: string | null;
};

type Failed = { status: "failed"; toast: ActionToast };

const unexpected: Failed = {
  status: "failed",
  toast: { type: "error", key: "unexpected" },
};

export type StartBookingResult =
  | { status: "codeSent"; appointmentId: string; toast: ActionToast }
  | { status: "slotTaken" }
  | { status: "limitReached" }
  | Failed;

export async function startBooking(
  request: BookingRequest,
): Promise<StartBookingResult> {
  if (!isLocale(request.locale)) return unexpected;
  const supabase = await createClient();

  if (request.replaces) {
    const { error } = await supabase.rpc("release_booking", {
      appointment_id: request.replaces,
    });
    if (error) return unexpected;
  }

  const { data, error } = await supabase.rpc("book_appointment", {
    service_id: request.serviceId,
    starts_at: request.slot,
    name: request.name,
    email: request.email,
    locale: request.locale,
    address: request.address || undefined,
  });
  if (error?.message === "slot_unavailable") return { status: "slotTaken" };
  if (error?.message === "booking_limit_reached")
    return { status: "limitReached" };
  const appointmentId = data?.[0]?.appointment_id;
  if (error || !appointmentId) return unexpected;

  const sent = await sendCode(request.email, request.locale);
  if (sent) {
    // Nobody can confirm a booking whose code never left, so it must not keep the slot.
    await supabase.rpc("release_booking", { appointment_id: appointmentId });
    return sent;
  }
  return {
    status: "codeSent",
    appointmentId,
    toast: { type: "success", key: "codeSent" },
  };
}

export type ConfirmBookingResult =
  | { status: "confirmed" | "awaitingMaster"; toast: ActionToast }
  | { status: "invalidCode" }
  | { status: "expired" }
  | Failed;

export async function confirmBooking({
  appointmentId,
  email,
  code,
}: {
  appointmentId: string;
  email: string;
  code: string;
}): Promise<ConfirmBookingResult> {
  if (!/^\d{6}$/.test(code)) return { status: "invalidCode" };
  const supabase = await createClient();

  const verified = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });
  if (isWrongCode(verified.error?.code)) return { status: "invalidCode" };
  if (verified.error)
    return { status: "failed", toast: otpFailureToast(verified.error.code) };

  const { data, error } = await supabase.rpc("claim_bookings");
  if (error) return unexpected;
  const booking = data.find((row) => row.appointment_id === appointmentId);
  if (!booking) return { status: "expired" };
  return booking.status === "confirmed"
    ? {
        status: "confirmed",
        toast: { type: "success", key: "bookingConfirmed" },
      }
    : {
        status: "awaitingMaster",
        toast: { type: "success", key: "bookingRequested" },
      };
}

export async function resendCode({
  email,
  locale,
}: {
  email: string;
  locale: string;
}): Promise<{ status: "sent"; toast: ActionToast } | Failed> {
  if (!isLocale(locale)) return unexpected;
  return (
    (await sendCode(email, locale)) ?? {
      status: "sent",
      toast: { type: "success", key: "codeSent" },
    }
  );
}

async function sendCode(email: string, locale: string): Promise<Failed | null> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, data: { locale } },
  });
  return error
    ? { status: "failed", toast: otpFailureToast(error.code) }
    : null;
}
