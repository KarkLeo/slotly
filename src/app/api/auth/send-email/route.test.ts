import { createHmac, randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { sendEmail, loadBookingDetails, takeRateLimit } = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  loadBookingDetails: vi.fn(),
  takeRateLimit: vi.fn(),
}));

vi.mock("@/emails/send", () => ({ sendEmail }));
vi.mock("@/db/rate-limit", () => ({ takeRateLimit }));
vi.mock("@/emails/booking-details", () => ({ loadBookingDetails }));
vi.mock("@/db/env", () => ({ supabaseUrl: "https://db.example" }));

const key = randomBytes(32);
const secret = `v1,whsec_${key.toString("base64")}`;

const body = JSON.stringify({
  user: { email: "mark@example.com", user_metadata: { locale: "en" } },
  email_data: {
    token: "123456",
    token_hash: "hash",
    token_new: "",
    token_hash_new: "",
    redirect_to: "https://slotly.example",
    email_action_type: "magiclink",
    site_url: "https://slotly.example",
  },
});

function withIp(content: string, ip: string) {
  return JSON.stringify({
    ...JSON.parse(content),
    metadata: { ip_address: ip },
  });
}

function hookRequest(
  content: string,
  signingKey = key,
  timestamp = String(Math.floor(Date.now() / 1000)),
) {
  const signature = createHmac("sha256", signingKey)
    .update(`msg_1.${timestamp}.${content}`)
    .digest("base64");
  return new Request("http://localhost/api/auth/send-email", {
    method: "POST",
    headers: {
      "webhook-id": "msg_1",
      "webhook-timestamp": timestamp,
      "webhook-signature": `v1,${signature}`,
    },
    body: content,
  });
}

beforeEach(() => {
  vi.stubEnv("SEND_EMAIL_HOOK_SECRET", secret);
  vi.stubEnv("SITE_URL", "https://slotly.example");
  sendEmail.mockResolvedValue(undefined);
  loadBookingDetails.mockResolvedValue(null);
  takeRateLimit.mockResolvedValue(true);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("POST /api/auth/send-email", () => {
  it("sends the email Auth asks for", async () => {
    const response = await POST(hookRequest(body));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "mark@example.com",
        subject: "Sign in to Slotly",
      }),
      expect.stringMatching(/^[0-9a-f]{64}$/),
    );
  });

  it("gives a retried call the same idempotency key", async () => {
    await POST(hookRequest(body));
    await POST(hookRequest(body));
    const [first, second] = sendEmail.mock.calls.map((call) => call[1]);
    expect(first).toBe(second);
  });

  it("shows the booking named in the link", async () => {
    loadBookingDetails.mockResolvedValue({
      master: "Olena",
      service: { uk: "Манікюр" },
      primaryLocale: "uk",
      locale: "uk",
      startsAt: "2030-01-10T10:00:00Z",
      endsAt: "2030-01-10T11:00:00Z",
      timeZone: "Europe/Kyiv",
      priceKind: "none",
      price: null,
      currency: "UAH",
      address: null,
      holdUntil: "2030-01-09T10:15:00Z",
    });
    const id = "6f1c1d36-3f0b-4f43-9d55-3c3a3b9e8a10";
    const booking = body.replace(
      '"redirect_to":"https://slotly.example"',
      `"redirect_to":"https://slotly.example/auth/confirm?booking=${id}"`,
    );
    const response = await POST(hookRequest(booking));
    expect(response.status).toBe(200);
    expect(loadBookingDetails).toHaveBeenCalledWith(id, "mark@example.com");
    const [email] = sendEmail.mock.calls[0];
    expect(email.subject).toBe("Підтвердіть запис у Slotly");
    expect(email.html).toContain("Olena");
  });

  it("counts emails by the IP that asked Auth for them", async () => {
    const fromIp = withIp(body, "203.0.113.5");
    await POST(hookRequest(fromIp));
    expect(takeRateLimit).toHaveBeenCalledWith(
      "email:ip:203.0.113.5",
      20,
      3600,
    );
  });

  it("refuses an email over budget in a way Auth passes on as 429", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    takeRateLimit.mockResolvedValue(false);
    const response = await POST(hookRequest(withIp(body, "203.0.113.5")));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      error: { http_code: 429, message: "Email rate limit exceeded" },
    });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith("Email budget exceeded", {
      bucket: "email:ip",
      ip: "203.0.113.5",
    });
  });

  it("spends the new user budget on a link naming a booking that does not exist", async () => {
    const forged = withIp(body, "203.0.113.5")
      .replace('"magiclink"', '"signup"')
      .replace(
        '"redirect_to":"https://slotly.example"',
        '"redirect_to":"https://slotly.example/auth/confirm?booking=6f1c1d36-3f0b-4f43-9d55-3c3a3b9e8a10"',
      );
    await POST(hookRequest(forged));
    expect(loadBookingDetails).toHaveBeenCalledWith(
      "6f1c1d36-3f0b-4f43-9d55-3c3a3b9e8a10",
      "mark@example.com",
    );
    expect(takeRateLimit).toHaveBeenCalledWith(
      "email:signup:203.0.113.5",
      3,
      3600,
    );
  });

  it("does not spend the new user budget on a booking that exists", async () => {
    loadBookingDetails.mockResolvedValue({
      master: "Olena",
      service: { uk: "Манікюр" },
      primaryLocale: "uk",
      locale: "uk",
      startsAt: "2030-01-10T10:00:00Z",
      endsAt: "2030-01-10T11:00:00Z",
      timeZone: "Europe/Kyiv",
      priceKind: "none",
      price: null,
      currency: "UAH",
      address: null,
      holdUntil: "2030-01-09T10:15:00Z",
    });
    const booking = withIp(body, "203.0.113.5")
      .replace('"magiclink"', '"signup"')
      .replace(
        '"redirect_to":"https://slotly.example"',
        '"redirect_to":"https://slotly.example/auth/confirm?booking=6f1c1d36-3f0b-4f43-9d55-3c3a3b9e8a10"',
      );
    await POST(hookRequest(booking));
    expect(takeRateLimit).not.toHaveBeenCalledWith(
      "email:signup:203.0.113.5",
      expect.anything(),
      expect.anything(),
    );
  });

  it("sends both email change confirmations", async () => {
    const change = JSON.stringify({
      user: { email: "mark@example.com", new_email: "new@example.com" },
      email_data: {
        token: "123456",
        token_hash: "hash",
        token_new: "654321",
        token_hash_new: "hash-new",
        redirect_to: "https://slotly.example",
        email_action_type: "email_change",
        site_url: "https://slotly.example",
      },
    });
    const response = await POST(hookRequest(change));
    expect(response.status).toBe(200);
    expect(sendEmail.mock.calls.map(([email]) => email.to).sort()).toEqual([
      "mark@example.com",
      "new@example.com",
    ]);
  });

  it("sends nothing for a wrong signature", async () => {
    const response = await POST(hookRequest(body, randomBytes(32)));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { http_code: 401, message: "Invalid signature" },
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends nothing for a stale signature", async () => {
    const old = String(Math.floor(Date.now() / 1000) - 600);
    const response = await POST(hookRequest(body, key, old));
    expect(response.status).toBe(401);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends nothing without a configured secret", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("SEND_EMAIL_HOOK_SECRET", "");
    const response = await POST(hookRequest(body));
    expect(response.status).toBe(500);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("refuses email types the app does not send", async () => {
    const recovery = body.replace('"magiclink"', '"recovery"');
    const response = await POST(hookRequest(recovery));
    expect(response.status).toBe(400);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("reports a failed delivery to Auth", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    sendEmail.mockRejectedValue(new Error("Email provider answered 500"));
    const response = await POST(hookRequest(body));
    expect(response.status).toBe(500);
  });
});
