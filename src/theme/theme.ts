import { readCookie } from "@/lib/cookies";

export const themes = ["system", "light", "dark"] as const;

export type Theme = (typeof themes)[number];

export const themeCookie = "slotly-theme";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && themes.includes(value as Theme);
}

// The system theme needs no class: the tokens follow prefers-color-scheme on their own.
export function themeClass(theme: Theme): "light" | "dark" | undefined {
  return theme === "system" ? undefined : theme;
}

// For screens rendered outside the root layout, where the server-side cookie is unavailable.
export function browserTheme(cookies: string): Theme {
  const value = readCookie(cookies, themeCookie);
  return isTheme(value) ? value : "system";
}
