import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/test/server-mocks";
import { confirmBooking, resendCode, startBooking } from "./booking-actions";

const auth = { signInWithOtp: vi.fn(), verifyOtp: vi.fn() };
const rpc = vi.fn();

vi.mock("@/db/server", () => ({ createClient: async () => ({ auth, rpc }) }));

const request = {
  serviceId: "service-1",
  slot: "2030-01-14T10:00:00.000Z",
  name: "Anna",
  email: "anna@example.com",
  address: "",
  locale: "en",
};

const booked = {
  data: [
    { appointment_id: "appointment-1", hold_until: "2030-01-14T09:15:00Z" },
  ],
  error: null,
};

function rpcError(message: string) {
  return { data: null, error: { code: "P0001", message } };
}

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockImplementation(async (name: string) =>
    name === "book_appointment" ? booked : { data: null, error: null },
  );
  auth.signInWithOtp.mockResolvedValue({ error: null });
  auth.verifyOtp.mockResolvedValue({ error: null });
});

describe("startBooking", () => {
  it("holds the slot and sends the code in the booking's language", async () => {
    await expect(startBooking(request)).resolves.toEqual({
      status: "codeSent",
      appointmentId: "appointment-1",
      toast: { type: "success", key: "codeSent" },
    });
    expect(rpc).toHaveBeenCalledWith("book_appointment", {
      service_id: "service-1",
      starts_at: "2030-01-14T10:00:00.000Z",
      name: "Anna",
      email: "anna@example.com",
      locale: "en",
      address: undefined,
    });
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: "anna@example.com",
      options: { shouldCreateUser: true, data: { locale: "en" } },
    });
  });

  it("passes the address of a home visit", async () => {
    await startBooking({ ...request, address: "Khreshchatyk 1" });
    expect(rpc).toHaveBeenCalledWith(
      "book_appointment",
      expect.objectContaining({ address: "Khreshchatyk 1" }),
    );
  });

  it("releases the booking it replaces before holding the new one", async () => {
    await startBooking({ ...request, replaces: "appointment-0" });
    expect(rpc.mock.calls.map(([name, args]) => [name, args])).toEqual([
      ["release_booking", { appointment_id: "appointment-0" }],
      ["book_appointment", expect.any(Object)],
    ]);
  });

  it("reports a taken slot without sending a code", async () => {
    rpc.mockResolvedValue(rpcError("slot_unavailable"));
    await expect(startBooking(request)).resolves.toEqual({
      status: "slotTaken",
    });
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("reports the active bookings limit", async () => {
    rpc.mockResolvedValue(rpcError("booking_limit_reached"));
    await expect(startBooking(request)).resolves.toEqual({
      status: "limitReached",
    });
  });

  it("reports any other refusal as unexpected", async () => {
    rpc.mockResolvedValue(rpcError("service_not_found"));
    await expect(startBooking(request)).resolves.toEqual({
      status: "failed",
      toast: { type: "error", key: "unexpected" },
    });
  });

  it("refuses a language the platform does not have", async () => {
    await expect(startBooking({ ...request, locale: "de" })).resolves.toEqual({
      status: "failed",
      toast: { type: "error", key: "unexpected" },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("frees the slot when the code cannot be sent", async () => {
    auth.signInWithOtp.mockResolvedValue({
      error: { code: "over_email_send_rate_limit" },
    });
    await expect(startBooking(request)).resolves.toEqual({
      status: "failed",
      toast: { type: "error", key: "rateLimited" },
    });
    expect(rpc).toHaveBeenLastCalledWith("release_booking", {
      appointment_id: "appointment-1",
    });
  });
});

describe("confirmBooking", () => {
  const confirm = {
    appointmentId: "appointment-1",
    email: "anna@example.com",
    code: "123456",
  };

  function claimed(rows: { appointment_id: string; status: string }[]) {
    rpc.mockResolvedValue({ data: rows, error: null });
  }

  it("keeps a malformed code as a field error without asking Auth", async () => {
    await expect(
      confirmBooking({ ...confirm, code: "12345" }),
    ).resolves.toEqual({ status: "invalidCode" });
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("keeps a wrong or expired code as a field error", async () => {
    auth.verifyOtp.mockResolvedValue({ error: { code: "otp_expired" } });
    await expect(confirmBooking(confirm)).resolves.toEqual({
      status: "invalidCode",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("reports other Auth failures as a toast", async () => {
    auth.verifyOtp.mockResolvedValue({
      error: { code: "over_request_rate_limit" },
    });
    await expect(confirmBooking(confirm)).resolves.toEqual({
      status: "failed",
      toast: { type: "error", key: "rateLimited" },
    });
  });

  it("confirms the booking once the code signs the client in", async () => {
    claimed([{ appointment_id: "appointment-1", status: "confirmed" }]);
    await expect(confirmBooking(confirm)).resolves.toEqual({
      status: "confirmed",
      toast: { type: "success", key: "bookingConfirmed" },
    });
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: "anna@example.com",
      token: "123456",
      type: "email",
    });
    expect(rpc).toHaveBeenCalledWith("claim_bookings");
  });

  it("leaves the booking waiting for a master without auto-confirm", async () => {
    claimed([{ appointment_id: "appointment-1", status: "pending" }]);
    await expect(confirmBooking(confirm)).resolves.toEqual({
      status: "awaitingMaster",
      toast: { type: "success", key: "bookingRequested" },
    });
  });

  it("reports a booking whose hold ran out before the code came", async () => {
    claimed([{ appointment_id: "appointment-2", status: "confirmed" }]);
    await expect(confirmBooking(confirm)).resolves.toEqual({
      status: "expired",
    });
  });

  it("reports a failed claim as unexpected", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(confirmBooking(confirm)).resolves.toEqual({
      status: "failed",
      toast: { type: "error", key: "unexpected" },
    });
  });
});

describe("resendCode", () => {
  it("sends a new code in the booking's language", async () => {
    await expect(
      resendCode({ email: "anna@example.com", locale: "uk" }),
    ).resolves.toEqual({
      status: "sent",
      toast: { type: "success", key: "codeSent" },
    });
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: "anna@example.com",
      options: { shouldCreateUser: true, data: { locale: "uk" } },
    });
  });

  it("reports a failed send as a toast", async () => {
    auth.signInWithOtp.mockResolvedValue({
      error: { code: "over_email_send_rate_limit" },
    });
    await expect(
      resendCode({ email: "anna@example.com", locale: "uk" }),
    ).resolves.toEqual({
      status: "failed",
      toast: { type: "error", key: "rateLimited" },
    });
  });
});
