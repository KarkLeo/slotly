import { slotTimeLabel, zoneLabel } from "@/booking/dates";
import { bookingRows, whenLabel, type DetailRow } from "@/emails/booking-rows";
import type { Translate } from "@/emails/translator";
import type { Notification } from "./notification";

export type NotificationMessage = {
  subject: string;
  title: string;
  intro: string;
  details: DetailRow[];
  comment: { label: string; text: string } | null;
  actions: { label: string; url: string }[];
  note: string | null;
};

export type NotificationLinks = { manage: string; bookAgain: string };

export function notificationMessage(
  notification: Notification,
  links: NotificationLinks,
  t: Translate,
): NotificationMessage {
  const { kind, audience, locale, appointment } = notification;
  const names = {
    master: appointment.masterName,
    client: appointment.clientName,
  };
  const rows = bookingRows(
    {
      master: appointment.masterName,
      service: appointment.service,
      primaryLocale: appointment.primaryLocale,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      timeZone: appointment.timeZone,
      priceKind: appointment.priceKind,
      price: appointment.price,
      currency: appointment.currency,
      address: appointment.address,
    },
    locale,
    t,
  );
  const [masterRow, ...otherRows] = rows;
  const previous = notification.previousStartsAt
    ? [
        {
          label: t("notifications.previously"),
          value: whenLabel(
            notification.previousStartsAt,
            appointment.timeZone,
            locale,
            t,
          ),
        },
      ]
    : [];
  const details =
    audience === "master"
      ? [
          { label: t("notifications.client"), value: appointment.clientName },
          ...previous,
          ...otherRows,
        ]
      : [masterRow, ...previous, ...otherRows];

  const manage =
    audience === "master"
      ? { label: t("notifications.openCabinet"), url: links.manage }
      : { label: t("notifications.manage"), url: links.manage };
  const bookAgain = {
    label: t("notifications.bookAgain"),
    url: links.bookAgain,
  };
  const offersAnotherTime =
    kind === "declined" ||
    kind === "cancelledByMaster" ||
    kind === "masterDidNotRespond";

  const comment =
    appointment.cancelComment &&
    (kind === "declined" ||
      kind === "cancelledByMaster" ||
      kind === "cancelledByClient")
      ? {
          label: t(
            kind === "cancelledByClient"
              ? "notifications.clientComment"
              : "notifications.masterComment",
          ),
          text: appointment.cancelComment,
        }
      : null;

  const waitsUntil =
    appointment.status === "pending" && appointment.holdUntil
      ? {
          time: slotTimeLabel(
            appointment.holdUntil,
            appointment.timeZone,
            locale,
          ),
          zone: zoneLabel(appointment.timeZone, locale),
        }
      : null;
  const note =
    kind === "decisionNeeded" && waitsUntil
      ? t("notifications.decisionNeeded.note", waitsUntil)
      : kind === "rescheduledByClient" && waitsUntil
        ? t("notifications.rescheduledByClient.note", waitsUntil)
        : null;

  return {
    subject: t(`notifications.${kind}.subject`, names),
    title: t(`notifications.${kind}.title`),
    intro: t(`notifications.${kind}.intro`, names),
    details,
    comment,
    actions: offersAnotherTime ? [bookAgain, manage] : [manage],
    note,
  };
}
