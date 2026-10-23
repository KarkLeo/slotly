import { createHmac, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhook } from "./webhook";

const key = randomBytes(32);
const secret = `v1,whsec_${key.toString("base64")}`;
const body = '{"user":{"email":"a@example.com"}}';
const now = new Date("2026-10-23T12:00:00Z");
const timestamp = String(now.getTime() / 1000);

function sign(content: string, signingKey = key) {
  return createHmac("sha256", signingKey).update(content).digest("base64");
}

function headers(signature: string, at = timestamp, id = "msg_1") {
  return new Headers({
    "webhook-id": id,
    "webhook-timestamp": at,
    "webhook-signature": signature,
  });
}

describe("verifyWebhook", () => {
  it("accepts a body signed with the secret", () => {
    const signature = `v1,${sign(`msg_1.${timestamp}.${body}`)}`;
    expect(verifyWebhook(secret, headers(signature), body, now)).toBe(true);
  });

  it("accepts one matching signature among several", () => {
    const signature = `v1,${sign("other")} v1,${sign(`msg_1.${timestamp}.${body}`)}`;
    expect(verifyWebhook(secret, headers(signature), body, now)).toBe(true);
  });

  it("rejects a signature made with another secret", () => {
    const signature = `v1,${sign(`msg_1.${timestamp}.${body}`, randomBytes(32))}`;
    expect(verifyWebhook(secret, headers(signature), body, now)).toBe(false);
  });

  it("rejects a changed body", () => {
    const signature = `v1,${sign(`msg_1.${timestamp}.${body}`)}`;
    expect(verifyWebhook(secret, headers(signature), `${body} `, now)).toBe(
      false,
    );
  });

  it("rejects a signature of another message id", () => {
    const signature = `v1,${sign(`msg_1.${timestamp}.${body}`)}`;
    expect(
      verifyWebhook(secret, headers(signature, timestamp, "msg_2"), body, now),
    ).toBe(false);
  });

  it("rejects a timestamp more than five minutes away", () => {
    const old = String(now.getTime() / 1000 - 301);
    const signature = `v1,${sign(`msg_1.${old}.${body}`)}`;
    expect(verifyWebhook(secret, headers(signature, old), body, now)).toBe(
      false,
    );
  });

  it("rejects missing headers and unknown signature versions", () => {
    expect(verifyWebhook(secret, new Headers(), body, now)).toBe(false);
    const signature = `v2,${sign(`msg_1.${timestamp}.${body}`)}`;
    expect(verifyWebhook(secret, headers(signature), body, now)).toBe(false);
  });
});
