"use server";

import { cookies } from "next/headers";
import { isTheme, themeCookie } from "./theme";

export async function setTheme(theme: string) {
  if (!isTheme(theme)) throw new Error(`Unsupported theme: ${theme}`);
  (await cookies()).set(themeCookie, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
