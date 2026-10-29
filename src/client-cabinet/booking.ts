import type { Database } from "@/db/types";
import type { Locale } from "@/i18n/locales";
import type { LocalizedText } from "@/landing/localize";

// Generated types lose the nullability of set-returning function columns.
export type MyBookingRow = Omit<
  Database["public"]["Functions"]["get_my_bookings"]["Returns"][number],
  "hold_until" | "price" | "address"
> & { hold_until: string | null; price: number | null; address: string | null };

export type MyBookingStatus =
  "pending" | "confirmed" | "completed" | "cancelled";

export type MyBooking = {
  id: string;
  status: MyBookingStatus;
  startsAt: string;
  endsAt: string;
  holdUntil: string | null;
  changeUntil: string;
  canReschedule: boolean;
  // The client's zone for an online booking made in another zone, otherwise the master's.
  timeZone: string;
  master: {
    name: string;
    slug: string;
    timeZone: string;
    autoConfirm: boolean;
    horizonDays: number;
    primaryLocale: Locale;
  };
  service: {
    id: string;
    name: LocalizedText;
    durationMinutes: number;
    priceKind: MyBookingRow["price_kind"];
    price: number | null;
    currency: string;
    format: MyBookingRow["format"];
  };
  address: string | null;
};

export function toMyBooking(row: MyBookingRow): MyBooking {
  return {
    id: row.appointment_id,
    status: row.status === "no_show" ? "completed" : row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    holdUntil: row.hold_until,
    changeUntil: row.change_until,
    canReschedule: row.can_reschedule,
    timeZone: row.booking_time_zone,
    master: {
      name: row.master_name,
      slug: row.master_slug,
      timeZone: row.time_zone,
      autoConfirm: row.auto_confirm,
      horizonDays: row.horizon_days,
      primaryLocale: row.primary_locale,
    },
    service: {
      id: row.service_id,
      name: row.service_name as LocalizedText,
      durationMinutes:
        (new Date(row.ends_at).getTime() - new Date(row.starts_at).getTime()) /
        60_000,
      priceKind: row.price_kind,
      price: row.price,
      currency: row.currency,
      format: row.format,
    },
    address: row.address,
  };
}

export function isUpcoming(booking: MyBooking, now: Date): boolean {
  return (
    (booking.status === "pending" || booking.status === "confirmed") &&
    new Date(booking.endsAt) > now
  );
}

export function canChange(booking: MyBooking, now: Date): boolean {
  return isUpcoming(booking, now) && new Date(booking.changeUntil) >= now;
}

export function splitBookings(
  bookings: MyBooking[],
  now: Date,
): { upcoming: MyBooking[]; history: MyBooking[] } {
  const byStart = (a: MyBooking, b: MyBooking) =>
    new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  return {
    upcoming: bookings.filter((b) => isUpcoming(b, now)).sort(byStart),
    history: bookings
      .filter((b) => !isUpcoming(b, now))
      .sort((a, b) => byStart(b, a)),
  };
}
