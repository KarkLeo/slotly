import "server-only";
import { createRemoteJWKSet } from "jose";
import { supabaseUrl } from "@/db/env";
import { siteUrl } from "@/lib/site-url";

export const issuer = `${supabaseUrl}/auth/v1`;
export const audience = "slotly-mcp";
export const jwks = createRemoteJWKSet(
  new URL(`${issuer}/.well-known/jwks.json`),
);
export const resourceMetadataPath =
  "/.well-known/oauth-protected-resource/api/mcp";

export function resourceUrl(): string {
  return `${siteUrl()}/api/mcp`;
}
