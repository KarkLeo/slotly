import {
  masterKinds,
  type Notification,
  type NotificationKind,
} from "./notification";

export function testNotification(
  kind: NotificationKind,
  overrides: Partial<Omit<Notification, "appointment">> = {},
  appointment: Partial<Notification["appointment"]> = {},
): Notification {
  return {
    id: "6a0c1d4e-8f2b-4c3a-9d5e-7f1a2b3c4d5e",
    kind,
    audience: masterKinds.includes(kind) ? "master" : "client",
    locale: "uk",
    recipientId: "5eed0000-0000-4000-8000-000000000012",
    recipientEmail: "mark@example.com",
    previousStartsAt: null,
    attempts: 0,
    ...overrides,
    appointment: {
      id: "a1",
      status: "confirmed",
      startsAt: "2026-11-03T12:00:00Z",
      endsAt: "2026-11-03T13:00:00Z",
      holdUntil: null,
      timeZone: "Europe/Kyiv",
      masterName: "Olena",
      masterSlug: "olena",
      service: { uk: "Манікюр", en: "Manicure" },
      primaryLocale: "uk",
      priceKind: "fixed",
      price: 500,
      currency: "UAH",
      address: null,
      clientName: "Mark Taylor",
      cancelComment: null,
      ...appointment,
    },
  };
}
