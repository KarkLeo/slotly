import "server-only";
import {
  claimDueNotifications,
  finishNotification,
  type DeliveryOutcome,
} from "@/db/notifications";
import { takeRateLimit } from "@/db/rate-limit";
import { translator } from "@/emails/translator";
import { landingPath } from "@/landing/routing";
import { siteUrl } from "@/lib/site-url";
import { channels, pickChannel, type Channel } from "./channels";
import { linkUrl, signLinkToken } from "./link-token";
import { notificationMessage, type NotificationLinks } from "./message";
import type { Notification } from "./notification";

export type DeliveryDeps = {
  claim: (max: number) => Promise<Notification[]>;
  finish: (
    id: string,
    outcome: DeliveryOutcome,
    channel?: Channel["kind"],
    error?: string,
  ) => Promise<void>;
  takeRateLimit: (
    bucket: string,
    maxHits: number,
    windowSeconds: number,
  ) => Promise<boolean>;
  channels: Channel[];
  now: () => number;
};

const batchSize = 20;
// The database waits 30 seconds for the call; stop taking batches well before that.
const budgetMs = 20_000;
// Half of the shared daily email quota stays for sign-in and booking codes.
const dailyEmailCap = 50;
const day = 86_400_000;

const defaultDeps: DeliveryDeps = {
  claim: claimDueNotifications,
  finish: finishNotification,
  takeRateLimit,
  channels,
  now: Date.now,
};

export async function deliverDue(
  deps: DeliveryDeps = defaultDeps,
): Promise<Record<"sent" | "retried" | "skipped", number>> {
  const counts = { sent: 0, retried: 0, skipped: 0 };
  const started = deps.now();
  while (deps.now() - started < budgetMs) {
    const batch = await deps.claim(batchSize);
    if (batch.length === 0) break;
    for (const notification of batch) {
      const outcome = await deliverOne(notification, deps);
      counts[outcome === "retry" ? "retried" : outcome] += 1;
    }
  }
  return counts;
}

async function deliverOne(
  notification: Notification,
  deps: DeliveryDeps,
): Promise<DeliveryOutcome> {
  const skip = async (reason: string) => {
    await deps.finish(notification.id, "skipped", undefined, reason);
    return "skipped" as const;
  };

  if (!stillRelevant(notification, deps.now()))
    return skip("No longer relevant");
  const route = pickChannel(notification, deps.channels);
  if (!route) return skip("No channel reaches the recipient");
  if (
    route.channel.kind === "email" &&
    !(await deps.takeRateLimit(
      "notifications:email:day",
      dailyEmailCap,
      day / 1000,
    ))
  ) {
    console.error("Daily notification email cap reached", {
      notification: notification.id,
    });
    return skip("Daily email cap reached");
  }

  try {
    const message = notificationMessage(
      notification,
      await links(notification),
      await translator(notification.locale),
    );
    await route.channel.deliver(message, notification, route.address);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await deps.finish(notification.id, "retry", undefined, reason);
    return "retry";
  }
  await deps.finish(notification.id, "sent", route.channel.kind);
  return "sent";
}

function stillRelevant(notification: Notification, now: number): boolean {
  const startsAt = new Date(notification.appointment.startsAt).getTime();
  if (notification.kind === "reminder")
    return notification.appointment.status === "confirmed" && startsAt > now;
  return startsAt > now - day;
}

async function links(notification: Notification): Promise<NotificationLinks> {
  const { appointment } = notification;
  const token = await signLinkToken({
    userId: notification.recipientId,
    appointmentId: appointment.id,
    audience: notification.audience,
    endsAt: appointment.endsAt,
  });
  return {
    manage: linkUrl(token),
    bookAgain: `${siteUrl()}${landingPath(appointment.masterSlug, notification.locale, appointment.primaryLocale)}`,
  };
}
