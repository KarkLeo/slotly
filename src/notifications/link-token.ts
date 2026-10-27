import "server-only";
import { jwtVerify, SignJWT } from "jose";
import { siteUrl } from "@/lib/site-url";
import type { Audience } from "./notification";

const audiences: Audience[] = ["client", "master"];
const validAfterEnd = 7 * 86_400;

function key(): Uint8Array {
  const secret = process.env.NOTIFICATION_LINK_SECRET;
  if (!secret)
    throw new Error("Missing environment variable NOTIFICATION_LINK_SECRET");
  return new TextEncoder().encode(secret);
}

export async function signLinkToken({
  userId,
  appointmentId,
  audience,
  endsAt,
}: {
  userId: string;
  appointmentId: string;
  audience: Audience;
  endsAt: string;
}): Promise<string> {
  return new SignJWT({ appointment: appointmentId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setAudience(audience)
    .setExpirationTime(
      Math.floor(new Date(endsAt).getTime() / 1000) + validAfterEnd,
    )
    .sign(key());
}

export async function verifyLinkToken(token: string): Promise<{
  userId: string;
  appointmentId: string;
  audience: Audience;
} | null> {
  try {
    const { payload } = await jwtVerify(token, key(), {
      algorithms: ["HS256"],
      audience: audiences,
    });
    const audience = audiences.find((value) => value === payload.aud);
    if (!payload.sub || typeof payload.appointment !== "string" || !audience)
      return null;
    return {
      userId: payload.sub,
      appointmentId: payload.appointment,
      audience,
    };
  } catch {
    return null;
  }
}

export function linkUrl(token: string): string {
  return `${siteUrl()}/auth/link?token=${encodeURIComponent(token)}`;
}

// SLT-21 and the master's account will open the booking itself.
export function bookingPath(audience: Audience, appointmentId: string): string {
  void audience;
  void appointmentId;
  return "/app";
}
