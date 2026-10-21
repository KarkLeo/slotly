import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flashCookie } from "@/toasts/toast";
import { cookieSet } from "@/toasts/test-mocks";
import { GET } from "./route";

const auth = { verifyOtp: vi.fn() };

vi.mock("@/db/server", () => ({ createClient: async () => ({ auth }) }));

beforeEach(() => vi.clearAllMocks());

describe("GET /auth/confirm", () => {
  it("flashes linkExpired and sends the user to login", async () => {
    auth.verifyOtp.mockResolvedValue({ error: { code: "otp_expired" } });
    const request = new NextRequest(
      "http://localhost/auth/confirm?token_hash=x&type=email",
    );
    await expect(GET(request)).rejects.toThrow("redirect:/login");
    expect(cookieSet).toHaveBeenCalledWith(
      flashCookie,
      "error:linkExpired",
      expect.objectContaining({ path: "/" }),
    );
  });

  it("flashes signedIn after a valid link", async () => {
    auth.verifyOtp.mockResolvedValue({ error: null });
    const request = new NextRequest(
      "http://localhost/auth/confirm?token_hash=x&type=email&next=/app",
    );
    await expect(GET(request)).rejects.toThrow("redirect:/app");
    expect(cookieSet).toHaveBeenCalledWith(
      flashCookie,
      "success:signedIn",
      expect.objectContaining({ path: "/" }),
    );
  });
});
