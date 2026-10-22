import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirectTarget } from "@/test/redirect";
import { cookieSet } from "@/test/server-mocks";
import { flashCookie } from "@/toasts/toast";
import { signIn, signOut } from "./actions";

const auth = {
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  signOut: vi.fn(),
};

vi.mock("@/db/server", () => ({ createClient: async () => ({ auth }) }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "uk" }));

const email = "anna@example.com";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.signInWithOtp.mockResolvedValue({ error: null });
  auth.verifyOtp.mockResolvedValue({ error: null });
  auth.signOut.mockResolvedValue({ error: null });
});

describe("signIn", () => {
  it("keeps an invalid email as a field error", async () => {
    await expect(
      signIn({ step: "email" }, form({ email: "nope" })),
    ).resolves.toEqual({
      step: "email",
      email: "nope",
      error: "invalidEmail",
    });
  });

  it("reports a sent code with a success toast", async () => {
    await expect(signIn({ step: "email" }, form({ email }))).resolves.toEqual({
      step: "code",
      email,
      toast: { type: "success", key: "codeSent" },
    });
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email,
      options: { shouldCreateUser: true, data: { locale: "uk" } },
    });
  });

  it("reports a rate limit as a toast", async () => {
    auth.signInWithOtp.mockResolvedValue({
      error: { code: "over_email_send_rate_limit" },
    });
    await expect(signIn({ step: "email" }, form({ email }))).resolves.toEqual({
      step: "email",
      email,
      toast: { type: "error", key: "rateLimited" },
    });
  });

  it("reports an unknown failure as an unexpected toast", async () => {
    auth.signInWithOtp.mockResolvedValue({ error: { code: "boom" } });
    await expect(signIn({ step: "email" }, form({ email }))).resolves.toEqual({
      step: "email",
      email,
      toast: { type: "error", key: "unexpected" },
    });
  });

  it("keeps a wrong code as a field error", async () => {
    auth.verifyOtp.mockResolvedValue({ error: { code: "otp_expired" } });
    await expect(
      signIn(
        { step: "code", email },
        form({ intent: "verify", email, code: "123456" }),
      ),
    ).resolves.toEqual({ step: "code", email, error: "invalidCode" });
  });

  it("flashes signedIn and redirects after a valid code", async () => {
    await expect(
      redirectTarget(
        signIn(
          { step: "code", email },
          form({ intent: "verify", email, code: "123456", next: "/app" }),
        ),
      ),
    ).resolves.toBe("/app");
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email,
      token: "123456",
      type: "email",
    });
    expect(cookieSet).toHaveBeenCalledWith(
      flashCookie,
      "success:signedIn",
      expect.objectContaining({ path: "/" }),
    );
  });
});

describe("signOut", () => {
  it("keeps the user signed in and fails when Supabase cannot sign out", async () => {
    const failure = new Error("network");
    auth.signOut.mockResolvedValue({ error: failure });
    await expect(signOut()).rejects.toBe(failure);
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("flashes signedOut and redirects home", async () => {
    await expect(redirectTarget(signOut())).resolves.toBe("/");
    expect(auth.signOut).toHaveBeenCalled();
    expect(cookieSet).toHaveBeenCalledWith(
      flashCookie,
      "success:signedOut",
      expect.objectContaining({ path: "/" }),
    );
  });
});
