import { render } from "react-email";
import { slotTimeLabel, zoneLabel } from "@/booking/dates";
import { AuthEmailLayout, type AuthEmailProps } from "./auth-email";
import type { AuthEmail } from "./auth-emails";
import { bookingRows } from "./booking-rows";
import { translator, type Translate } from "./translator";

export type RenderedEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

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
        details: bookingRows(email.booking, email.locale, t),
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
