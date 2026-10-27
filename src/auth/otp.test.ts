import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestHeaders } from "@/test/server-mocks";
import { sendOtp, signInAs, verifyOtp } from "./otp";

const admin = { getUserById: vi.fn(), generateLink: vi.fn() };
const auth = { signInWithOtp: vi.fn(), verifyOtp: vi.fn(), admin };
const createAdminClient = vi.fn();

vi.mock("@/db/admin", () => ({
  createAdminClient: (ip: string | null) => createAdminClient(ip) ?? { auth },
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
  admin.getUserById.mockResolvedValue({
    data: { user: { id: "u1", email: "anna@example.com" } },
    error: null,
  });
  admin.generateLink.mockResolvedValue({
    data: { properties: { hashed_token: "hashed" } },
    error: null,
  });
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

describe("signInAs", () => {
  it("opens a session for the user on behalf of the client's IP without sending an email", async () => {
    await expect(signInAs(cookieClient, "u1")).resolves.toBeNull();
    expect(admin.getUserById).toHaveBeenCalledWith("u1");
    expect(admin.generateLink).toHaveBeenCalledWith({
      type: "magiclink",
      email: "anna@example.com",
    });
    expect(createAdminClient).toHaveBeenCalledWith("203.0.113.5");
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: "hashed",
      type: "magiclink",
    });
    expect(setSession).toHaveBeenCalledWith(session);
  });

  it("returns the error for a user that is gone", async () => {
    admin.getUserById.mockResolvedValue({
      data: { user: null },
      error: { code: "user_not_found" },
    });
    await expect(signInAs(cookieClient, "u1")).resolves.toEqual({
      code: "user_not_found",
    });
    expect(setSession).not.toHaveBeenCalled();
  });

  it("fails for a user without an email", async () => {
    admin.getUserById.mockResolvedValue({
      data: { user: { id: "u1", email: undefined } },
      error: null,
    });
    await expect(signInAs(cookieClient, "u1")).resolves.not.toBeNull();
    expect(admin.generateLink).not.toHaveBeenCalled();
    expect(setSession).not.toHaveBeenCalled();
  });

  it("returns the error when no link can be made", async () => {
    admin.generateLink.mockResolvedValue({
      data: { properties: null },
      error: { code: "validation_failed" },
    });
    await expect(signInAs(cookieClient, "u1")).resolves.toEqual({
      code: "validation_failed",
    });
  });
});
