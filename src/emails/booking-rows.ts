import { slotDateTimeLabel, zoneLabel } from "@/booking/dates";
import type { Locale } from "@/i18n/locales";
import { formatDuration, formatMoney } from "@/landing/format";
import { localize } from "@/landing/localize";
import type { BookingDetails } from "./auth-emails";
import type { Translate } from "./translator";

export type BookingSummary = Omit<BookingDetails, "holdUntil" | "locale">;

export type DetailRow = { label: string; value: string };

export function whenLabel(
  instant: string,
  timeZone: string,
  locale: Locale,
  t: Translate,
): string {
  return t("booking.whenValue", {
    date: slotDateTimeLabel(instant, timeZone, locale),
    zone: zoneLabel(timeZone, locale),
  });
}

export function bookingRows(
  booking: BookingSummary,
  locale: Locale,
  t: Translate,
): DetailRow[] {
  const minutes =
    (new Date(booking.endsAt).getTime() -
      new Date(booking.startsAt).getTime()) /
    60_000;
  const price =
    booking.price === null || booking.priceKind === "none"
      ? null
      : formatMoney(booking.price, booking.currency, locale);
  return [
    { label: t("booking.master"), value: booking.master },
    {
      label: t("booking.service"),
      value: localize(booking.service, locale, booking.primaryLocale),
    },
    {
      label: t("booking.when"),
      value: whenLabel(booking.startsAt, booking.timeZone, locale, t),
    },
    { label: t("booking.duration"), value: formatDuration(minutes, locale) },
    ...(price
      ? [
          {
            label: t("booking.price"),
            value:
              booking.priceKind === "from"
                ? t("booking.priceFrom", { price })
                : price,
          },
        ]
      : []),
    ...(booking.address
      ? [{ label: t("booking.address"), value: booking.address }]
      : []),
  ];
}
