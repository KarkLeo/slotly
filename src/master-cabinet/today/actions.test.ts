import { beforeEach, describe, expect, it, vi } from "vitest";
import { cancelAppointment, confirmAppointment } from "./actions";

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

const unexpected = { toast: { type: "error", key: "unexpected" } };

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ data: null, error: null });
});

describe("confirmAppointment", () => {
  it("confirms and refreshes the screen", async () => {
    await expect(
      confirmAppointment({}, form({ appointmentId })),
    ).resolves.toEqual({
      toast: { type: "success", key: "appointmentConfirmed" },
    });
    expect(rpc).toHaveBeenCalledWith("confirm_appointment", {
      appointment_id: appointmentId,
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("shows the error, not success, when the hold ran out before the tap", async () => {
    rpc.mockResolvedValue(rpcError("appointment_expired"));
    await expect(
      confirmAppointment({}, form({ appointmentId })),
    ).resolves.toEqual({ toast: { type: "error", key: "decisionExpired" } });
    expect(refresh).toHaveBeenCalled();
  });

  it.each([
    "appointment_not_awaiting_master",
    "appointment_not_active",
    "appointment_not_found",
  ])("says the appointment changed on %s", async (message) => {
    rpc.mockResolvedValue(rpcError(message));
    await expect(
      confirmAppointment({}, form({ appointmentId })),
    ).resolves.toEqual({ toast: { type: "error", key: "appointmentChanged" } });
    expect(refresh).toHaveBeenCalled();
  });

  it("shows the unexpected toast for an unknown error without refreshing", async () => {
    rpc.mockResolvedValue(rpcError("boom"));
    await expect(
      confirmAppointment({}, form({ appointmentId })),
    ).resolves.toEqual(unexpected);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refuses a malformed id without calling the database", async () => {
    await expect(
      confirmAppointment({}, form({ appointmentId: "1" })),
    ).resolves.toEqual(unexpected);
    expect(rpc).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("cancelAppointment", () => {
  const decline = { appointmentId };

  it("declines with the trimmed comment and refreshes", async () => {
    await expect(
      cancelAppointment({}, form({ ...decline, comment: "  Не встигаю  " })),
    ).resolves.toEqual({
      toast: { type: "success", key: "appointmentDeclined" },
    });
    expect(rpc).toHaveBeenCalledWith("cancel_appointment", {
      appointment_id: appointmentId,
      comment: "Не встигаю",
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("sends no comment when it is blank or missing", async () => {
    await cancelAppointment({}, form({ ...decline, comment: "  " }));
    expect(rpc).toHaveBeenLastCalledWith("cancel_appointment", {
      appointment_id: appointmentId,
      comment: undefined,
    });
    await cancelAppointment({}, form(decline));
    expect(rpc).toHaveBeenLastCalledWith("cancel_appointment", {
      appointment_id: appointmentId,
      comment: undefined,
    });
  });

  it("maps refusals and refreshes", async () => {
    rpc.mockResolvedValue(rpcError("appointment_expired"));
    await expect(cancelAppointment({}, form(decline))).resolves.toEqual({
      toast: { type: "error", key: "decisionExpired" },
    });
    rpc.mockResolvedValue(rpcError("appointment_not_active"));
    await expect(cancelAppointment({}, form(decline))).resolves.toEqual({
      toast: { type: "error", key: "appointmentChanged" },
    });
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("shows the unexpected toast for an unknown error without refreshing", async () => {
    rpc.mockResolvedValue(rpcError("boom"));
    await expect(cancelAppointment({}, form(decline))).resolves.toEqual(
      unexpected,
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it.each<Record<string, string>>([
    { appointmentId: "1" },
    { ...decline, comment: "x".repeat(501) },
  ])("refuses invalid input %#", async (values) => {
    await expect(cancelAppointment({}, form(values))).resolves.toEqual(
      unexpected,
    );
    expect(rpc).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
