import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestHeaders } from "@/test/server-mocks";
import { sendOtp, verifyOtp } from "./otp";

const auth = { signInWithOtp: vi.fn(), verifyOtp: vi.fn() };
const createAdminClient = vi.fn((_ip: string | null) => ({ auth }));

vi.mock("@/db/admin", () => ({
  createAdminClient: (ip: string | null) => createAdminClient(ip),
}));

const session = { access_token: "access", refresh_token: "refresh" };
const setSession = vi.fn();
const cookieClient = { auth: { setSession } } as unknown as Parameters<
  typeof verifyOtp
>[0];

beforeEach(() => {
  vi.clearAllMocks();
  requestHeaders.set("x-forwarded-for", "203.0.113.5");
  auth.signInWithOtp.mockResolvedValue({ error: null });
  auth.verifyOtp.mockResolvedValue({ data: { session }, error: null });
  setSession.mockResolvedValue({ error: null });
});

describe("sendOtp", () => {
  it("asks Auth for a code on behalf of the client's IP", async () => {
    await expect(
      sendOtp("anna@example.com", {
        data: { locale: "uk" },
        emailRedirectTo: "https://slotly.test/auth/confirm",
      }),
    ).resolves.toBeNull();
    expect(createAdminClient).toHaveBeenCalledWith("203.0.113.5");
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: "anna@example.com",
      options: {
        shouldCreateUser: true,
        data: { locale: "uk" },
        emailRedirectTo: "https://slotly.test/auth/confirm",
      },
    });
  });

  it("returns the Auth error", async () => {
    auth.signInWithOtp.mockResolvedValue({
      error: { code: "over_email_send_rate_limit" },
    });
    await expect(sendOtp("anna@example.com", { data: {} })).resolves.toEqual({
      code: "over_email_send_rate_limit",
    });
  });
});

describe("verifyOtp", () => {
  const params = {
    email: "anna@example.com",
    token: "123456",
    type: "email",
  } as const;

  it("verifies on behalf of the client's IP and keeps the session in cookies", async () => {
    await expect(verifyOtp(cookieClient, params)).resolves.toBeNull();
    expect(createAdminClient).toHaveBeenCalledWith("203.0.113.5");
    expect(auth.verifyOtp).toHaveBeenCalledWith(params);
    expect(setSession).toHaveBeenCalledWith(session);
  });

  it("returns a failed verification without a session", async () => {
    auth.verifyOtp.mockResolvedValue({
      data: { session: null },
      error: { code: "otp_expired" },
    });
    await expect(verifyOtp(cookieClient, params)).resolves.toEqual({
      code: "otp_expired",
    });
    expect(setSession).not.toHaveBeenCalled();
  });

  it("returns a failure to keep the session", async () => {
    setSession.mockResolvedValue({ error: { code: "session_not_found" } });
    await expect(verifyOtp(cookieClient, params)).resolves.toEqual({
      code: "session_not_found",
    });
  });
});
