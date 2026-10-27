import { timingSafeEqual } from "node:crypto";
import { deliverDue } from "@/notifications/deliver";

// The database calls this when a notification is queued and every minute for retries.
export async function POST(request: Request) {
  const secret = process.env.NOTIFICATIONS_SECRET;
  if (!secret) {
    console.error("Missing environment variable NOTIFICATIONS_SECRET");
    return Response.json({ error: "Not configured" }, { status: 500 });
  }
  if (!authorized(request.headers.get("authorization"), secret))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await deliverDue());
}

function authorized(header: string | null, secret: string): boolean {
  const given = Buffer.from(header ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
