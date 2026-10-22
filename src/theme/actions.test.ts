import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieSet } from "@/test/server-mocks";
import { setTheme } from "./actions";
import { themeCookie } from "./theme";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("setTheme", () => {
  it("remembers the chosen theme for a year", async () => {
    await setTheme("dark");
    expect(cookieSet).toHaveBeenCalledWith(themeCookie, "dark", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  });

  it("rejects an unknown theme", async () => {
    await expect(setTheme("sepia")).rejects.toThrow();
    expect(cookieSet).not.toHaveBeenCalled();
  });
});
