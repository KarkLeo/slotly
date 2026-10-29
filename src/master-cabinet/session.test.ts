import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirectTarget } from "@/test/redirect";
import { requireMaster } from "./session";

const { requireUser, isMaster } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  isMaster: vi.fn(),
}));

const memos = vi.hoisted(() => [] as (() => void)[]);

// React's cache() only memoizes inside a server request, so emulate one request per test.
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T>(fn: () => T) => {
    let memo: { value: T } | undefined;
    memos.push(() => (memo = undefined));
    return () => (memo ??= { value: fn() }).value;
  },
}));

vi.mock("@/auth/session", () => ({ requireUser }));
vi.mock("@/client-cabinet/load", () => ({ isMaster }));

beforeEach(() => {
  vi.clearAllMocks();
  memos.forEach((reset) => reset());
});

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

  it("does one auth and masters lookup per request", async () => {
    requireUser.mockResolvedValue({ id: "u3", email: null });
    isMaster.mockResolvedValue(true);
    await requireMaster();
    await requireMaster();
    expect(requireUser).toHaveBeenCalledTimes(1);
    expect(isMaster).toHaveBeenCalledTimes(1);
  });

  it("sends a non-master to their bookings", async () => {
    requireUser.mockResolvedValue({ id: "u2", email: null });
    isMaster.mockResolvedValue(false);
    await expect(redirectTarget(requireMaster())).resolves.toBe(
      "/app/bookings",
    );
  });
});
