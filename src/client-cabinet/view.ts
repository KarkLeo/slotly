import { slotDateTimeLabel, slotTimeLabel, zoneLabel } from "@/booking/dates";
import type { Locale } from "@/i18n/locales";
import { formatDuration, formatMoney, initials } from "@/landing/format";
import { localize } from "@/landing/localize";
import type { ServiceView } from "@/landing/view";
import { canChange, isUpcoming, type MyBooking } from "./booking";

export type BookingStatusView =
  "confirmed" | "awaitingMaster" | "completed" | "cancelled";

export type BookingView = {
  id: string;
  href: string;
  status: BookingStatusView;
  date: string;
  time: string;
  zone: string;
  master: { name: string; initials: string; href: string };
  service: {
    name: string;
    duration: string;
    price: ServiceView["price"];
    format: ServiceView["format"];
  };
  address: string | null;
  changeUntil: string | null;
  late: boolean;
  waitsUntil: string | null;
  canReschedule: boolean;
  needsApproval: boolean;
  bookAgainHref: string | null;
  slots: {
    serviceId: string;
    startsAt: string;
    timeZone: string;
    horizonDays: number;
  };
};

export function bookingPath(id: string): string {
  return `/app/bookings/${id}`;
}

export function toBookingView(
  booking: MyBooking,
  locale: Locale,
  now: Date,
): BookingView {
  const { master, service } = booking;
  const zone = master.timeZone;
  const time = (value: string) => slotTimeLabel(value, zone, locale);
  const upcoming = isUpcoming(booking, now);
  const changeable = canChange(booking, now);

  return {
    id: booking.id,
    href: bookingPath(booking.id),
    status: booking.status === "pending" ? "awaitingMaster" : booking.status,
    date: new Intl.DateTimeFormat(locale, {
      timeZone: zone,
      weekday: "short",
      day: "numeric",
      month: "long",
    }).format(new Date(booking.startsAt)),
    time: `${time(booking.startsAt)}–${time(booking.endsAt)}`,
    zone: zoneLabel(zone, locale),
    master: {
      name: master.name,
      initials: initials(master.name),
      href: `/${master.slug}`,
    },
    service: {
      name: localize(service.name, locale, master.primaryLocale),
      duration: formatDuration(service.durationMinutes, locale),
      price: {
        kind: service.priceKind,
        amount:
          service.price === null
            ? null
            : formatMoney(service.price, service.currency, locale),
      },
      format: service.format,
    },
    address: booking.address,
    changeUntil: changeable
      ? slotDateTimeLabel(booking.changeUntil, zone, locale)
      : null,
    late: upcoming && !changeable,
    waitsUntil:
      upcoming && booking.status === "pending" && booking.holdUntil
        ? slotDateTimeLabel(booking.holdUntil, zone, locale)
        : null,
    canReschedule: changeable && booking.canReschedule,
    needsApproval: !master.autoConfirm,
    bookAgainHref:
      booking.status === "completed" && booking.canReschedule
        ? `/${master.slug}?service=${service.id}`
        : null,
    slots: {
      serviceId: service.id,
      startsAt: booking.startsAt,
      timeZone: zone,
      horizonDays: master.horizonDays,
    },
  };
}
