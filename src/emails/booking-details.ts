import "server-only";
import { createAdminClient } from "@/db/admin";
import type { LocalizedText } from "@/landing/localize";
import type { BookingDetails } from "./auth-emails";

export async function loadBookingDetails(
  appointmentId: string,
  email: string,
): Promise<BookingDetails | null> {
  const { data, error } = await createAdminClient()
    .rpc("booking_email_details", { appointment_id: appointmentId, email })
    .abortSignal(AbortSignal.timeout(1500))
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    master: data.master_name,
    service: data.service_name as LocalizedText,
    primaryLocale: data.primary_locale,
    locale: data.locale,
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    timeZone: data.time_zone,
    priceKind: data.price_kind,
    price: data.price,
    currency: data.currency,
    address: data.address,
    holdUntil: data.hold_until,
  };
}
