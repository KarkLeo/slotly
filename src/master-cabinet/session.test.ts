import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirectTarget } from "@/test/redirect";
import { requireMaster } from "./session";

const { requireUser, isMaster } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  isMaster: vi.fn(),
}));

vi.mock("@/auth/session", () => ({ requireUser }));
vi.mock("@/client-cabinet/load", () => ({ isMaster }));

beforeEach(() => vi.clearAllMocks());

describe("requireMaster", () => {
  it("returns the user when they are a master", async () => {
    requireUser.mockResolvedValue({ id: "u1", email: "m@example.com" });
    isMaster.mockResolvedValue(true);
    await expect(requireMaster()).resolves.toEqual({
      id: "u1",
      email: "m@example.com",
    });
    expect(isMaster).toHaveBeenCalledWith("u1");
  });

  it("sends a non-master to their bookings", async () => {
    requireUser.mockResolvedValue({ id: "u2", email: null });
    isMaster.mockResolvedValue(false);
    await expect(redirectTarget(requireMaster())).resolves.toBe(
      "/app/bookings",
    );
  });
});
