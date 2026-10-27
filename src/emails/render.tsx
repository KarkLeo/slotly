import { render } from "react-email";
import { slotTimeLabel, zoneLabel } from "@/booking/dates";
import type { Locale } from "@/i18n/locales";
import type { NotificationMessage } from "@/notifications/message";
import { EmailLayout, type EmailLayoutProps } from "./email-layout";
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
  const element = <EmailLayout locale={email.locale} {...props} />;
  return {
    to: email.to,
    subject,
    html: await render(element),
    text: await render(element, { plainText: true }),
  };
}

export async function renderNotificationEmail(
  { subject, ...message }: NotificationMessage,
  to: string,
  locale: Locale,
): Promise<RenderedEmail> {
  const element = (
    <EmailLayout locale={locale} preview={null} code={null} {...message} />
  );
  return {
    to,
    subject,
    html: await render(element),
    text: await render(element, { plainText: true }),
  };
}

function content(
  email: AuthEmail,
  t: Translate,
): Omit<EmailLayoutProps, "locale"> & { subject: string } {
  switch (email.kind) {
    case "signIn":
    case "signUp":
      return {
        subject: t(`${email.kind}.subject`),
        preview: t("preview", { code: email.code }),
        title: t(`${email.kind}.title`),
        intro: t(`${email.kind}.intro`),
        details: [],
        comment: null,
        actions: [{ label: t(`${email.kind}.button`), url: email.link }],
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
        comment: null,
        actions: [{ label: t("booking.button"), url: email.link }],
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
        comment: null,
        actions: [{ label: t(`${email.kind}.button`), url: email.link }],
        code: null,
        note: t(`${email.kind}.note`),
      };
  }
}
