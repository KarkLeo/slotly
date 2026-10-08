import "server-only";
import { createRemoteJWKSet } from "jose";
import { supabaseUrl } from "@/db/env";

export const issuer = `${supabaseUrl}/auth/v1`;
export const audience = "slotly-mcp";
export const jwks = createRemoteJWKSet(
  new URL(`${issuer}/.well-known/jwks.json`),
);
export const resourceMetadataPath =
  "/.well-known/oauth-protected-resource/api/mcp";

export function siteUrl(): string {
  const value = process.env.SITE_URL;
  if (!value) throw new Error("Missing environment variable SITE_URL");
  return value.replace(/\/$/, "");
}

export function resourceUrl(): string {
  return `${siteUrl()}/api/mcp`;
}
