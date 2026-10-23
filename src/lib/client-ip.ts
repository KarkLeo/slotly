import "server-only";
import { isIP } from "node:net";
import { headers } from "next/headers";

// Traefik appends the address it saw, so only the last value of X-Forwarded-For cannot be forged by the client.
export async function clientIp(): Promise<string | null> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",").at(-1);
  const value = (forwarded ?? requestHeaders.get("x-real-ip") ?? "").trim();
  return isIP(value) ? value : null;
}
