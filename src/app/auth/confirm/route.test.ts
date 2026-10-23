import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirectTarget } from "@/test/redirect";
import { cookieSet } from "@/test/server-mocks";
import { flashCookie } from "@/toasts/toast";
import { GET } from "./route";

const { verifyOtp } = vi.hoisted(() => ({ verifyOtp: vi.fn() }));
const rpc = vi.fn();

vi.mock("@/db/server", () => ({ createClient: async () => ({ rpc }) }));
vi.mock("@/auth/otp", () => ({ verifyOtp }));

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ data: [], error: null });
});

function validLink() {
  verifyOtp.mockResolvedValue(null);
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
    verifyOtp.mockResolvedValue({ code: "otp_expired" });
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
    verifyOtp.mockResolvedValue(null);
    const request = new NextRequest(
      "http://localhost/auth/confirm?token_hash=x&type=email&next=/app",
    );
    await expect(redirectTarget(GET(request))).resolves.toBe("/app");
    expect(verifyOtp).toHaveBeenCalledWith(expect.anything(), {
      token_hash: "x",
      type: "email",
    });
    expect(cookieSet).toHaveBeenCalledWith(
      flashCookie,
      "success:signedIn",
      expect.objectContaining({ path: "/" }),
    );
  });

  const booking = "8c7f2c1e-6a51-4c3b-9d0e-2f4a5b6c7d8e";

  function bookingLink() {
    verifyOtp.mockResolvedValue(null);
    return new NextRequest(
      `http://localhost/auth/confirm?token_hash=x&type=email&booking=${booking}`,
    );
  }

  it("confirms the booking named in the link", async () => {
    rpc.mockResolvedValue({
      data: [{ appointment_id: booking, status: "confirmed" }],
      error: null,
    });
    await expect(redirectTarget(GET(bookingLink()))).resolves.toBe("/app");
    expect(rpc).toHaveBeenCalledWith("claim_bookings", {
      appointment_ids: [booking],
    });
    flashed("success:bookingConfirmed");
  });

  it("reports a booking that waits for the master", async () => {
    rpc.mockResolvedValue({
      data: [{ appointment_id: booking, status: "pending" }],
      error: null,
    });
    await redirectTarget(GET(bookingLink()));
    flashed("success:bookingRequested");
  });

  it("reports a booking whose time is no longer held", async () => {
    await redirectTarget(GET(bookingLink()));
    flashed("error:bookingExpired");
  });

  it("still signs in when the booking cannot be claimed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    await redirectTarget(GET(bookingLink()));
    flashed("error:bookingExpired");
  });

  it("confirms nothing for a plain sign-in link or a malformed booking", async () => {
    await redirectTarget(GET(validLink()));
    verifyOtp.mockResolvedValue(null);
    await redirectTarget(
      GET(
        new NextRequest(
          "http://localhost/auth/confirm?token_hash=x&type=email&booking=nope",
        ),
      ),
    );
    expect(rpc).not.toHaveBeenCalled();
  });
});
