import "server-only";
import type { RenderedEmail } from "./render";

// Auth gives the whole hook call 5 seconds, retries included.
const timeout = 2000;

// Auth retries a failed hook call, so a repeated key must not send the same email twice.
export async function sendEmail(
  email: RenderedEmail,
  idempotencyKey: string,
): Promise<void> {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("Missing environment variable EMAIL_FROM");
  const resendKey = process.env.RESEND_API_KEY;
  const mailpitUrl = process.env.MAILPIT_URL;

  let response: Response;
  if (resendKey) {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      signal: AbortSignal.timeout(timeout),
      body: JSON.stringify({
        from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });
  } else if (mailpitUrl) {
    const [, name = "", address = from] =
      /^\s*(.*?)\s*<(.+)>\s*$/.exec(from) ?? [];
    response = await fetch(`${mailpitUrl.replace(/\/$/, "")}/api/v1/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(timeout),
      body: JSON.stringify({
        From: { Name: name, Email: address },
        To: [{ Email: email.to }],
        Subject: email.subject,
        HTML: email.html,
        Text: email.text,
      }),
    });
  } else {
    throw new Error("Missing environment variable RESEND_API_KEY");
  }

  if (!response.ok)
    throw new Error(`Email provider answered ${response.status}`);
}
