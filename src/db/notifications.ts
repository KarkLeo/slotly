import "server-only";
import {
  notificationFromRow,
  type Notification,
} from "@/notifications/notification";
import { createAdminClient } from "./admin";

export type DeliveryOutcome = "sent" | "retry" | "skipped";

export async function claimDueNotifications(
  max: number,
): Promise<Notification[]> {
  const { data, error } = await createAdminClient().rpc(
    "claim_due_notifications",
    { max_count: max },
  );
  if (error) throw error;
  return data.map(notificationFromRow);
}

export async function finishNotification(
  id: string,
  outcome: DeliveryOutcome,
  channel?: "email" | "telegram",
  error?: string,
): Promise<void> {
  const { error: rpcError } = await createAdminClient().rpc(
    "finish_notification",
    { notification_id: id, outcome, channel, error },
  );
  if (rpcError) throw rpcError;
}
