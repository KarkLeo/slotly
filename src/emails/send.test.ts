import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "./send";

const fetchMock = vi.fn();
const email = {
  to: "mark@example.com",
  subject: "Subject",
  html: "<p>Hi</p>",
  text: "Hi",
};

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubEnv("EMAIL_FROM", "Slotly <slotly@example.com>");
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("MAILPIT_URL", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

function sent() {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return {
    url,
    headers: new Headers(init.headers),
    body: JSON.parse(String(init.body)),
  };
}

describe("sendEmail", () => {
  it("sends through Resend once per key", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    await sendEmail(email, "msg_1:mark@example.com");
    const { url, headers, body } = sent();
    expect(url).toBe("https://api.resend.com/emails");
    expect(headers.get("authorization")).toBe("Bearer re_test");
    expect(headers.get("idempotency-key")).toBe("msg_1:mark@example.com");
    expect(body).toEqual({
      from: "Slotly <slotly@example.com>",
      to: ["mark@example.com"],
      subject: "Subject",
      html: "<p>Hi</p>",
      text: "Hi",
    });
  });

  it("delivers to Mailpit in local development", async () => {
    vi.stubEnv("MAILPIT_URL", "http://127.0.0.1:54324/");
    await sendEmail(email, "msg_1");
    const { url, body } = sent();
    expect(url).toBe("http://127.0.0.1:54324/api/v1/send");
    expect(body).toEqual({
      From: { Name: "Slotly", Email: "slotly@example.com" },
      To: [{ Email: "mark@example.com" }],
      Subject: "Subject",
      HTML: "<p>Hi</p>",
      Text: "Hi",
    });
  });

  it("fails when the provider refuses the email", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    fetchMock.mockResolvedValue(new Response("{}", { status: 422 }));
    await expect(sendEmail(email, "msg_1")).rejects.toThrow("422");
  });

  it("fails without a configured transport or sender", async () => {
    await expect(sendEmail(email, "msg_1")).rejects.toThrow();
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "");
    await expect(sendEmail(email, "msg_1")).rejects.toThrow("EMAIL_FROM");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
