import { describe, expect, it } from "vitest";
import { browserTheme, isTheme, themeClass, themeCookie } from "./theme";

describe("isTheme", () => {
  it("accepts the three modes only", () => {
    expect(["system", "light", "dark"].every(isTheme)).toBe(true);
    expect(isTheme("sepia")).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });
});

describe("themeClass", () => {
  it("forces light and dark, and leaves the system theme to the browser", () => {
    expect(themeClass("light")).toBe("light");
    expect(themeClass("dark")).toBe("dark");
    expect(themeClass("system")).toBeUndefined();
  });
});

describe("browserTheme", () => {
  it("reads the theme cookie", () => {
    expect(browserTheme(`a=1; ${themeCookie}=dark; b=2`)).toBe("dark");
  });

  it("falls back to the system theme", () => {
    expect(browserTheme("a=1")).toBe("system");
    expect(browserTheme(`${themeCookie}=sepia`)).toBe("system");
  });
});
