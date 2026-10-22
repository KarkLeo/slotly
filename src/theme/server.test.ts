import { beforeEach, describe, expect, it } from "vitest";
import { cookieGet } from "@/test/server-mocks";
import { getTheme } from "./server";
import { themeCookie } from "./theme";

beforeEach(() => {
  cookieGet.mockReset();
});

describe("getTheme", () => {
  it("reads the theme cookie", async () => {
    cookieGet.mockImplementation((name: string) =>
      name === themeCookie ? { name, value: "light" } : undefined,
    );
    await expect(getTheme()).resolves.toBe("light");
  });

  it("falls back to the system theme", async () => {
    await expect(getTheme()).resolves.toBe("system");
    cookieGet.mockReturnValue({ name: themeCookie, value: "sepia" });
    await expect(getTheme()).resolves.toBe("system");
  });
});
