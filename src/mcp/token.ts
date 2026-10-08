import type { AuthInfo } from "@modelcontextprotocol/server";
import { jwtVerify, type JWTVerifyGetKey } from "jose";

export type AgentAuthExtra = { userId: string; email: string | null };

export function createTokenVerifier({
  jwks,
  issuer,
}: {
  jwks: JWTVerifyGetKey;
  issuer: string;
}) {
  return async (token: string | undefined): Promise<AuthInfo | undefined> => {
    if (!token) return undefined;

    let payload;
    try {
      ({ payload } = await jwtVerify(token, jwks, {
        issuer,
        algorithms: ["ES256", "RS256"],
        requiredClaims: ["exp", "sub"],
      }));
    } catch {
      return undefined;
    }

    if (typeof payload.client_id !== "string" || !payload.sub) return undefined;

    const extra: AgentAuthExtra = {
      userId: payload.sub,
      email: typeof payload.email === "string" ? payload.email : null,
    };

    return {
      token,
      clientId: payload.client_id,
      scopes: typeof payload.scope === "string" ? payload.scope.split(" ") : [],
      expiresAt: payload.exp,
      extra,
    };
  };
}
