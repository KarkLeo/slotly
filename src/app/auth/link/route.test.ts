import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirectTarget } from "@/test/redirect";
import { cookieSet } from "@/test/server-mocks";
import { flashCookie } from "@/toasts/toast";
import { GET } from "./route";

const { signInAs, verifyLinkToken } = vi.hoisted(() => ({
  signInAs: vi.fn(),
  verifyLinkToken: vi.fn(),
}));
const auth = { getClaims: vi.fn(), signOut: vi.fn() };

vi.mock("@/db/server", () => ({ createClient: async () => ({ auth }) }));
vi.mock("@/auth/otp", () => ({ signInAs }));
vi.mock("@/notifications/link-token", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  verifyLinkToken,
}));

const owner = "5eed0000-0000-4000-8000-000000000011";
const request = new NextRequest("http://localhost/auth/link?token=t");

beforeEach(() => {
  vi.clearAllMocks();
  verifyLinkToken.mockResolvedValue({
    userId: owner,
    appointmentId: "a1",
    audience: "client",
  });
  signInAs.mockResolvedValue(null);
  auth.getClaims.mockResolvedValue({ data: null });
  auth.signOut.mockResolvedValue({ error: null });
});

function flashed(value: string) {
  expect(cookieSet).toHaveBeenCalledWith(
    flashCookie,
    value,
    expect.objectContaining({ path: "/" }),
  );
}

describe("GET /auth/link", () => {
  it("signs in the link's user and opens the booking", async () => {
    await expect(redirectTarget(GET(request))).resolves.toBe(
      "/app/bookings/a1",
    );
    expect(verifyLinkToken).toHaveBeenCalledWith("t");
    expect(signInAs).toHaveBeenCalledWith(expect.anything(), owner);
    flashed("success:signedIn");
  });

  it("keeps the session of the same user", async () => {
    auth.getClaims.mockResolvedValue({ data: { claims: { sub: owner } } });
    await expect(redirectTarget(GET(request))).resolves.toBe(
      "/app/bookings/a1",
    );
    expect(signInAs).not.toHaveBeenCalled();
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("switches from another user to the link's user", async () => {
    auth.getClaims.mockResolvedValue({ data: { claims: { sub: "other" } } });
    await expect(redirectTarget(GET(request))).resolves.toBe(
      "/app/bookings/a1",
    );
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(signInAs).toHaveBeenCalledWith(expect.anything(), owner);
  });

  it("sends an expired or forged link to login", async () => {
    verifyLinkToken.mockResolvedValue(null);
    await expect(redirectTarget(GET(request))).resolves.toBe("/login");
    expect(signInAs).not.toHaveBeenCalled();
    flashed("error:linkExpired");
  });

  it("sends a link without a token to login", async () => {
    await expect(
      redirectTarget(GET(new NextRequest("http://localhost/auth/link"))),
    ).resolves.toBe("/login");
    expect(verifyLinkToken).not.toHaveBeenCalled();
  });

  it("sends to login when the session cannot be opened", async () => {
    signInAs.mockResolvedValue({ code: "user_not_found" });
    await expect(redirectTarget(GET(request))).resolves.toBe("/login");
    flashed("error:linkExpired");
  });
});
