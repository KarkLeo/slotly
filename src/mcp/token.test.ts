import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWTPayload,
} from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { createTokenVerifier } from "./token";

const issuer = "https://project.supabase.co/auth/v1";
const audience = "slotly-mcp";
const kid = "test-key";

let privateKey: CryptoKey;
let otherKey: CryptoKey;
let verify: ReturnType<typeof createTokenVerifier>;

beforeAll(async () => {
  const pair = await generateKeyPair("ES256");
  privateKey = pair.privateKey;
  otherKey = (await generateKeyPair("ES256")).privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid, alg: "ES256" };
  verify = createTokenVerifier({
    jwks: createLocalJWKSet({ keys: [jwk] }),
    issuer,
    audience,
  });
});

const oauthClaims: JWTPayload = {
  sub: "user-1",
  email: "master@example.com",
  client_id: "client-1",
  scope: "email profile",
  role: "agent",
};

function sign(
  claims: JWTPayload,
  { key = privateKey, iss = issuer, aud = audience, expiresIn = "1h" } = {},
) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "ES256", kid })
    .setIssuer(iss)
    .setAudience(aud)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

describe("createTokenVerifier", () => {
  it("accepts an OAuth access token and exposes the master and client", async () => {
    const token = await sign(oauthClaims);

    const auth = await verify(token);

    expect(auth).toMatchObject({
      token,
      clientId: "client-1",
      scopes: ["email", "profile"],
      extra: { userId: "user-1", email: "master@example.com" },
    });
    expect(auth?.expiresAt).toBeGreaterThan(Date.now() / 1000);
  });

  it("rejects a missing token", async () => {
    expect(await verify(undefined)).toBeUndefined();
  });

  it("rejects a web session token without client_id", async () => {
    const session = { ...oauthClaims, client_id: undefined };
    expect(await verify(await sign(session))).toBeUndefined();
  });

  it("rejects a token from another issuer", async () => {
    const token = await sign(oauthClaims, { iss: "https://evil.example" });
    expect(await verify(token)).toBeUndefined();
  });

  it("rejects a token issued for another audience", async () => {
    const token = await sign(oauthClaims, { aud: "authenticated" });
    expect(await verify(token)).toBeUndefined();
  });

  it("rejects an expired token", async () => {
    const token = await sign(oauthClaims, { expiresIn: "-1m" });
    expect(await verify(token)).toBeUndefined();
  });

  it("rejects a token signed with another key", async () => {
    const token = await sign(oauthClaims, { key: otherKey });
    expect(await verify(token)).toBeUndefined();
  });

  it("rejects a malformed token", async () => {
    expect(await verify("not-a-jwt")).toBeUndefined();
  });
});
