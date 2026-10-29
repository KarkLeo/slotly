import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirectTarget } from "@/test/redirect";
import { cookieSet } from "@/test/server-mocks";
import { flashCookie } from "@/toasts/toast";
import { cancelBooking, rescheduleBooking } from "./actions";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
const rpc = vi.fn();

vi.mock("@/db/server", () => ({ createClient: async () => ({ rpc }) }));
vi.mock("next/cache", () => ({ refresh }));

const appointmentId = "6f1c2c1e-8a8e-4c55-9a43-2f7c5b0e1d11";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

function rpcError(message: string) {
  return { data: null, error: { code: "P0001", message } };
}

function flashed(value: string) {
  expect(cookieSet).toHaveBeenCalledWith(
    flashCookie,
    value,
    expect.objectContaining({ path: "/" }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ data: null, error: null });
});

describe("cancelBooking", () => {
  it("cancels with the trimmed comment and returns to the list", async () => {
    await expect(
      redirectTarget(
        cancelBooking({}, form({ appointmentId, comment: "  Захворіла  " })),
      ),
    ).resolves.toBe("/app/bookings");
    expect(rpc).toHaveBeenCalledWith("cancel_appointment", {
      appointment_id: appointmentId,
      comment: "Захворіла",
    });
    flashed("success:bookingCancelled");
  });

  it("sends no comment when the client left it empty", async () => {
    await redirectTarget(
      cancelBooking({}, form({ appointmentId, comment: " " })),
    );
    expect(rpc).toHaveBeenCalledWith("cancel_appointment", {
      appointment_id: appointmentId,
      comment: undefined,
    });
  });

  it("explains a passed deadline and refreshes the card", async () => {
    rpc.mockResolvedValue(rpcError("cancel_deadline_passed"));
    await expect(
      cancelBooking({}, form({ appointmentId, comment: "" })),
    ).resolves.toEqual({ toast: { type: "error", key: "changeClosed" } });
    expect(refresh).toHaveBeenCalled();
  });

  it("refuses a malformed id without calling the database", async () => {
    await expect(
      cancelBooking({}, form({ appointmentId: "1", comment: "" })),
    ).resolves.toEqual({ toast: { type: "error", key: "unexpected" } });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("shows the unexpected toast for an unknown error", async () => {
    rpc.mockResolvedValue(rpcError("boom"));
    await expect(
      cancelBooking({}, form({ appointmentId, comment: "" })),
    ).resolves.toEqual({ toast: { type: "error", key: "unexpected" } });
  });
});

describe("rescheduleBooking", () => {
  const request = { appointmentId, startsAt: "2030-01-14T10:00:00.000Z" };

  it("moves the booking and opens its card", async () => {
    rpc.mockResolvedValue({ data: "confirmed", error: null });
    await expect(redirectTarget(rescheduleBooking(request))).resolves.toBe(
      `/app/bookings/${appointmentId}`,
    );
    expect(rpc).toHaveBeenCalledWith("reschedule_booking", {
      appointment_id: appointmentId,
      starts_at: "2030-01-14T10:00:00.000Z",
    });
    flashed("success:bookingRescheduled");
  });

  it("says the new time waits for the master", async () => {
    rpc.mockResolvedValue({ data: "pending", error: null });
    await redirectTarget(rescheduleBooking(request));
    flashed("success:rescheduleRequested");
  });

  it("lets the client pick another time when the slot is taken", async () => {
    rpc.mockResolvedValue(rpcError("slot_unavailable"));
    await expect(rescheduleBooking(request)).resolves.toEqual({
      status: "slotTaken",
    });
  });

  it("returns to the card when moving is no longer allowed", async () => {
    rpc.mockResolvedValue(rpcError("service_not_found"));
    await expect(redirectTarget(rescheduleBooking(request))).resolves.toBe(
      `/app/bookings/${appointmentId}`,
    );
    flashed("error:rescheduleClosed");
  });

  it("refuses a time that is not an instant", async () => {
    await expect(
      rescheduleBooking({ ...request, startsAt: "tomorrow" }),
    ).resolves.toEqual({
      status: "failed",
      toast: { type: "error", key: "unexpected" },
    });
    expect(rpc).not.toHaveBeenCalled();
  });
});
