import { createTranslator } from "next-intl";
import { render } from "react-email";
import { slotDateTimeLabel, slotTimeLabel, zoneLabel } from "@/booking/dates";
import type { Locale } from "@/i18n/locales";
import { formatDuration, formatMoney } from "@/landing/format";
import { localize } from "@/landing/localize";
import { AuthEmailLayout, type AuthEmailProps } from "./auth-email";
import type { AuthEmail, BookingDetails } from "./auth-emails";
import type messages from "../../messages/emails/en.json";

export type RenderedEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type Translate = ReturnType<typeof createTranslator<typeof messages>>;

async function translator(locale: Locale): Promise<Translate> {
  const { default: dictionary } = (await import(
    `../../messages/emails/${locale}.json`
  )) as { default: typeof messages };
  return createTranslator({ locale, messages: dictionary });
}

export async function renderAuthEmail(
  email: AuthEmail,
): Promise<RenderedEmail> {
  const t = await translator(email.locale);
  const { subject, ...props } = content(email, t);
  const element = <AuthEmailLayout locale={email.locale} {...props} />;
  return {
    to: email.to,
    subject,
    html: await render(element),
    text: await render(element, { plainText: true }),
  };
}

function content(
  email: AuthEmail,
  t: Translate,
): Omit<AuthEmailProps, "locale"> & { subject: string } {
  switch (email.kind) {
    case "signIn":
    case "signUp":
      return {
        subject: t(`${email.kind}.subject`),
        preview: t("preview", { code: email.code }),
        title: t(`${email.kind}.title`),
        intro: t(`${email.kind}.intro`),
        details: [],
        button: t(`${email.kind}.button`),
        link: email.link,
        code: email.code,
        note: t(`${email.kind}.note`),
      };
    case "booking":
      return {
        subject: t("booking.subject"),
        preview: t("preview", { code: email.code }),
        title: t("booking.title"),
        intro: t("booking.intro"),
        details: bookingDetails(email.booking, email.locale, t),
        button: t("booking.button"),
        link: email.link,
        code: email.code,
        note: t("booking.note", {
          time: slotTimeLabel(
            email.booking.holdUntil,
            email.booking.timeZone,
            email.locale,
          ),
          zone: zoneLabel(email.booking.timeZone, email.locale),
        }),
      };
    case "emailChangeNew":
    case "emailChangeCurrent":
      return {
        subject: t(`${email.kind}.subject`),
        preview: null,
        title: t(`${email.kind}.title`),
        intro: t(`${email.kind}.intro`, { email: email.newEmail }),
        details: [],
        button: t(`${email.kind}.button`),
        link: email.link,
        code: null,
        note: t(`${email.kind}.note`),
      };
  }
}

function bookingDetails(
  booking: BookingDetails,
  locale: Locale,
  t: Translate,
): AuthEmailProps["details"] {
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
      value: t("booking.whenValue", {
        date: slotDateTimeLabel(booking.startsAt, booking.timeZone, locale),
        zone: zoneLabel(booking.timeZone, locale),
      }),
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
