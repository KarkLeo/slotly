import { SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bookingPath,
  linkUrl,
  signLinkToken,
  verifyLinkToken,
} from "./link-token";

const secret = "a".repeat(64);
const userId = "5eed0000-0000-4000-8000-000000000011";
const appointmentId = "6a0c1d4e-8f2b-4c3a-9d5e-7f1a2b3c4d5e";

beforeEach(() => {
  vi.stubEnv("NOTIFICATION_LINK_SECRET", secret);
  vi.stubEnv("SITE_URL", "https://slotly.example/");
});

afterEach(() => vi.unstubAllEnvs());

function inDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

describe("link tokens", () => {
  it("carry the user, the appointment and the audience", async () => {
    const token = await signLinkToken({
      userId,
      appointmentId,
      audience: "master",
      endsAt: inDays(1),
    });
    await expect(verifyLinkToken(token)).resolves.toEqual({
      userId,
      appointmentId,
      audience: "master",
    });
  });

  it("stay valid for a week after the appointment ends", async () => {
    const valid = await signLinkToken({
      userId,
      appointmentId,
      audience: "client",
      endsAt: inDays(-6),
    });
    const expired = await signLinkToken({
      userId,
      appointmentId,
      audience: "client",
      endsAt: inDays(-8),
    });
    await expect(verifyLinkToken(valid)).resolves.not.toBeNull();
    await expect(verifyLinkToken(expired)).resolves.toBeNull();
  });

  it("are refused when signed with another secret", async () => {
    const token = await signLinkToken({
      userId,
      appointmentId,
      audience: "client",
      endsAt: inDays(1),
    });
    vi.stubEnv("NOTIFICATION_LINK_SECRET", "b".repeat(64));
    await expect(verifyLinkToken(token)).resolves.toBeNull();
  });

  it("are refused for an unknown audience", async () => {
    const token = await new SignJWT({ appointment: appointmentId })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(userId)
      .setAudience("admin")
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(secret));
    await expect(verifyLinkToken(token)).resolves.toBeNull();
  });

  it("are refused when malformed", async () => {
    await expect(verifyLinkToken("not-a-token")).resolves.toBeNull();
  });

  it("fail loudly without a secret", async () => {
    vi.stubEnv("NOTIFICATION_LINK_SECRET", "");
    await expect(
      signLinkToken({
        userId,
        appointmentId,
        audience: "client",
        endsAt: inDays(1),
      }),
    ).rejects.toThrow("NOTIFICATION_LINK_SECRET");
  });

  it("open the link route on the site", () => {
    expect(linkUrl("x.y.z")).toBe(
      "https://slotly.example/auth/link?token=x.y.z",
    );
  });

  it("lead a client to the booking and a master to the cabinet", () => {
    expect(bookingPath("client", appointmentId)).toBe(
      `/app/bookings/${appointmentId}`,
    );
    expect(bookingPath("master", appointmentId)).toBe("/app");
  });
});
