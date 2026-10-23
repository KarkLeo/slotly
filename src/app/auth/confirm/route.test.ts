import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirectTarget } from "@/test/redirect";
import { cookieSet } from "@/test/server-mocks";
import { flashCookie } from "@/toasts/toast";
import { GET } from "./route";

const auth = { verifyOtp: vi.fn() };
const rpc = vi.fn();

vi.mock("@/db/server", () => ({ createClient: async () => ({ auth, rpc }) }));

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ data: [], error: null });
});

function validLink() {
  auth.verifyOtp.mockResolvedValue({ error: null });
  return new NextRequest(
    "http://localhost/auth/confirm?token_hash=x&type=email",
  );
}

function flashed(value: string) {
  expect(cookieSet).toHaveBeenCalledWith(
    flashCookie,
    value,
    expect.objectContaining({ path: "/" }),
  );
}

describe("GET /auth/confirm", () => {
  it("flashes linkExpired and sends the user to login", async () => {
    auth.verifyOtp.mockResolvedValue({ error: { code: "otp_expired" } });
    const request = new NextRequest(
      "http://localhost/auth/confirm?token_hash=x&type=email",
    );
    await expect(redirectTarget(GET(request))).resolves.toBe("/login");
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
    await expect(redirectTarget(GET(request))).resolves.toBe("/app");
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: "x",
      type: "email",
    });
    expect(cookieSet).toHaveBeenCalledWith(
      flashCookie,
      "success:signedIn",
      expect.objectContaining({ path: "/" }),
    );
  });

  it("confirms the bookings made with the email of the link", async () => {
    rpc.mockResolvedValue({
      data: [
        { appointment_id: "a", status: "pending" },
        { appointment_id: "b", status: "confirmed" },
      ],
      error: null,
    });
    await expect(redirectTarget(GET(validLink()))).resolves.toBe("/app");
    expect(rpc).toHaveBeenCalledWith("claim_bookings");
    flashed("success:bookingConfirmed");
  });

  it("reports bookings that wait for the master", async () => {
    rpc.mockResolvedValue({
      data: [{ appointment_id: "a", status: "pending" }],
      error: null,
    });
    await redirectTarget(GET(validLink()));
    flashed("success:bookingRequested");
  });

  it("still signs in when the bookings cannot be claimed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    await redirectTarget(GET(validLink()));
    flashed("success:signedIn");
  });
});
