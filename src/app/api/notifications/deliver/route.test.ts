import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { deliverDue } = vi.hoisted(() => ({ deliverDue: vi.fn() }));

vi.mock("@/notifications/deliver", () => ({ deliverDue }));

beforeEach(() => {
  vi.stubEnv("NOTIFICATIONS_SECRET", "local-notifications-secret");
  vi.spyOn(console, "error").mockImplementation(() => {});
  deliverDue.mockResolvedValue({ sent: 2, retried: 1, skipped: 0 });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  deliverDue.mockReset();
});

function request(authorization?: string) {
  return new Request("http://localhost/api/notifications/deliver", {
    method: "POST",
    headers: authorization ? { Authorization: authorization } : {},
  });
}

describe("POST /api/notifications/deliver", () => {
  it("delivers due notifications for the database", async () => {
    const response = await POST(request("Bearer local-notifications-secret"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sent: 2,
      retried: 1,
      skipped: 0,
    });
  });

  it.each([
    ["without a secret", undefined],
    ["with a wrong secret", "Bearer local-notifications-secreT"],
    ["with a shorter secret", "Bearer local"],
    ["with another scheme", "Basic local-notifications-secret"],
  ])("refuses a call %s", async (_, authorization) => {
    const response = await POST(request(authorization));
    expect(response.status).toBe(401);
    expect(deliverDue).not.toHaveBeenCalled();
  });

  it("fails loudly when the server has no secret", async () => {
    vi.stubEnv("NOTIFICATIONS_SECRET", "");
    const response = await POST(request("Bearer "));
    expect(response.status).toBe(500);
    expect(console.error).toHaveBeenCalled();
    expect(deliverDue).not.toHaveBeenCalled();
  });
});
