import { createHash } from "node:crypto";
import { supabaseUrl } from "@/db/env";
import { authEmails, type AuthEmail } from "@/emails/auth-emails";
import { loadBookingDetails } from "@/emails/booking-details";
import { renderAuthEmail } from "@/emails/render";
import { sendEmail } from "@/emails/send";
import { verifyWebhook } from "@/emails/webhook";
import { siteUrl } from "@/lib/site-url";

// Supabase Auth calls this Send Email Hook instead of its own SMTP for every Auth email.
export async function POST(request: Request) {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET;
  if (!secret) {
    console.error("Missing environment variable SEND_EMAIL_HOOK_SECRET");
    return hookError(500, "Email not sent");
  }

  const body = await request.text();
  if (!verifyWebhook(secret, request.headers, body))
    return hookError(401, "Invalid signature");

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return hookError(400, "Invalid payload");
  }

  try {
    const emails = await authEmails(payload, {
      siteUrl: siteUrl(),
      supabaseUrl,
      loadBooking: loadBookingDetails,
    });
    if (!emails) return hookError(400, "Unsupported email");

    await Promise.all(
      emails.map(async (email) =>
        sendEmail(await renderAuthEmail(email), idempotencyKey(email)),
      ),
    );
    return Response.json({});
  } catch (error) {
    console.error(error);
    return hookError(500, "Email not sent");
  }
}

// Each retry of a hook call gets a new webhook id, while the link of an issued code stays the same.
function idempotencyKey(email: AuthEmail): string {
  return createHash("sha256").update(`${email.to} ${email.link}`).digest("hex");
}

function hookError(status: number, message: string) {
  return Response.json({ error: { http_code: status, message } }, { status });
}
