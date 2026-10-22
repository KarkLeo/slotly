import "server-only";
import { cookies } from "next/headers";
import { isTheme, type Theme, themeCookie } from "./theme";

export async function getTheme(): Promise<Theme> {
  const value = (await cookies()).get(themeCookie)?.value;
  return isTheme(value) ? value : "system";
}
