import "server-only";
import { renderNotificationEmail } from "@/emails/render";
import { sendEmail } from "@/emails/send";
import type { NotificationMessage } from "./message";
import type { Notification } from "./notification";

export type Channel = {
  kind: "email" | "telegram";
  address(notification: Notification): string | null;
  deliver(
    message: NotificationMessage,
    notification: Notification,
    address: string,
  ): Promise<void>;
};

export const emailChannel: Channel = {
  kind: "email",
  address: (notification) => notification.recipientEmail,
  async deliver(message, notification, address) {
    await sendEmail(
      await renderNotificationEmail(message, address, notification.locale),
      notification.id,
    );
  },
};

// Telegram goes first once it exists: it is the main channel, email the fallback.
export const channels: Channel[] = [emailChannel];

export function pickChannel(
  notification: Notification,
  list: Channel[] = channels,
): { channel: Channel; address: string } | null {
  for (const channel of list) {
    const address = channel.address(notification);
    if (address) return { channel, address };
  }
  return null;
}
