import type { Database } from "@/db/types";
import type { Locale } from "@/i18n/locales";
import type { LocalizedText } from "@/landing/localize";

export const notificationKinds = [
  "decisionNeeded",
  "confirmed",
  "declined",
  "cancelledByMaster",
  "cancelledByClient",
  "rescheduledByMaster",
  "rescheduledByClient",
  "masterDidNotRespond",
  "bookedByMaster",
  "reminder",
] as const;

export type NotificationKind = (typeof notificationKinds)[number];

export const masterKinds: readonly NotificationKind[] = [
  "decisionNeeded",
  "cancelledByClient",
  "rescheduledByClient",
];

export type Audience = "client" | "master";

export type Notification = {
  id: string;
  kind: NotificationKind;
  audience: Audience;
  locale: Locale;
  recipientId: string;
  recipientEmail: string | null;
  previousStartsAt: string | null;
  attempts: number;
  appointment: {
    id: string;
    status: Database["public"]["Enums"]["appointment_status"];
    startsAt: string;
    endsAt: string;
    holdUntil: string | null;
    timeZone: string;
    masterName: string;
    masterSlug: string;
    service: LocalizedText;
    primaryLocale: Locale;
    priceKind: Database["public"]["Enums"]["price_kind"];
    price: number | null;
    currency: string;
    address: string | null;
    clientName: string;
    cancelComment: string | null;
  };
};

type NotificationRow =
  Database["public"]["Functions"]["claim_due_notifications"]["Returns"][number];

export function notificationFromRow(row: NotificationRow): Notification {
  const data = row.data as { previousStartsAt?: string } | null;
  return {
    id: row.id,
    kind: row.kind.replace(/_([a-z])/g, (_, letter: string) =>
      letter.toUpperCase(),
    ) as NotificationKind,
    audience: row.audience as Audience,
    locale: row.locale,
    recipientId: row.recipient_id,
    recipientEmail: row.recipient_email,
    previousStartsAt: data?.previousStartsAt ?? null,
    attempts: row.attempts,
    appointment: {
      id: row.appointment_id,
      status: row.status,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      holdUntil: row.hold_until,
      timeZone: row.time_zone,
      masterName: row.master_name,
      masterSlug: row.master_slug,
      service: row.service_name as LocalizedText,
      primaryLocale: row.primary_locale,
      priceKind: row.price_kind,
      price: row.price,
      currency: row.currency,
      address: row.address,
      clientName: row.client_name,
      cancelComment: row.cancel_comment,
    },
  };
}
