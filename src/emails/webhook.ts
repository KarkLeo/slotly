import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const tolerance = 5 * 60;

// Standard Webhooks: the signature is an HMAC of "id.timestamp.body" with the base64 key after "v1,whsec_".
export function verifyWebhook(
  secret: string,
  headers: Headers,
  body: string,
  now = new Date(),
): boolean {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatures = headers.get("webhook-signature");
  if (!id || !timestamp || !signatures) return false;

  const sentAt = Number(timestamp);
  if (!Number.isInteger(sentAt)) return false;
  if (Math.abs(now.getTime() / 1000 - sentAt) > tolerance) return false;

  const key = Buffer.from(secret.replace(/^v1,whsec_/, ""), "base64");
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${body}`)
    .digest();

  return signatures.split(" ").some((entry) => {
    const [version, signature] = entry.split(",");
    if (version !== "v1" || !signature) return false;
    const given = Buffer.from(signature, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
