import { z } from "zod";
import { defaultLocale, isLocale, type Locale } from "@/i18n/locales";
import type { LocalizedText } from "@/landing/localize";

export type BookingDetails = {
  master: string;
  service: LocalizedText;
  primaryLocale: Locale;
  locale: Locale;
  startsAt: string;
  endsAt: string;
  timeZone: string;
  priceKind: "fixed" | "from" | "none";
  price: number | null;
  currency: string;
  address: string | null;
  holdUntil: string;
};

type Envelope = { to: string; locale: Locale; link: string };

export type AuthEmail =
  | (Envelope & { kind: "signIn" | "signUp"; code: string })
  | (Envelope & { kind: "booking"; code: string; booking: BookingDetails })
  | (Envelope & {
      kind: "emailChangeNew" | "emailChangeCurrent";
      newEmail: string;
    });

const payloadSchema = z.object({
  user: z.object({
    email: z.string(),
    new_email: z.string().optional(),
    user_metadata: z.record(z.string(), z.unknown()).optional(),
  }),
  email_data: z.object({
    token: z.string(),
    token_hash: z.string(),
    token_new: z.string().optional(),
    token_hash_new: z.string().optional(),
    redirect_to: z.string(),
    email_action_type: z.string(),
  }),
});

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Decides which emails a Supabase Auth Send Email Hook call should send; null means the app does not send this kind.
export async function authEmails(
  body: unknown,
  {
    siteUrl,
    supabaseUrl,
    loadBooking,
  }: {
    siteUrl: string;
    supabaseUrl: string;
    loadBooking: (
      appointmentId: string,
      email: string,
    ) => Promise<BookingDetails | null>;
  },
): Promise<AuthEmail[] | null> {
  const loadBookingSafely = (appointmentId: string, email: string) =>
    loadBooking(appointmentId, email).catch((error: unknown) => {
      console.error(error);
      return null;
    });
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return null;
  const { user, email_data: data } = parsed.data;
  const metadataLocale = user.user_metadata?.locale;
  const locale = isLocale(metadataLocale) ? metadataLocale : defaultLocale;

  switch (data.email_action_type) {
    case "magiclink":
    case "email":
    case "signup": {
      const code = data.token;
      const bookingId = bookingIdFrom(data.redirect_to, siteUrl);
      // claim_bookings checks the booking itself, so the link keeps it even when the details are missing.
      const link = `${siteUrl}/auth/confirm?${bookingId ? `booking=${bookingId}&` : ""}token_hash=${encodeURIComponent(data.token_hash)}&type=email`;
      const booking =
        bookingId && (await loadBookingSafely(bookingId, user.email));
      if (booking)
        return [
          {
            kind: "booking",
            to: user.email,
            locale: booking.locale,
            code,
            link,
            booking,
          },
        ];
      return [
        {
          kind: data.email_action_type === "signup" ? "signUp" : "signIn",
          to: user.email,
          locale,
          code,
          link,
        },
      ];
    }
    case "email_change": {
      const newEmail = user.new_email;
      if (!newEmail) return null;
      // Supabase verifies an email change itself, as its default template did.
      const verify = (tokenHash: string) =>
        `${supabaseUrl}/auth/v1/verify?type=email_change&redirect_to=${encodeURIComponent(data.redirect_to)}&token=${encodeURIComponent(tokenHash)}`;
      const toNew: AuthEmail = {
        kind: "emailChangeNew",
        to: newEmail,
        locale,
        newEmail,
        link: verify(data.token_hash),
      };
      // With secure email change the current address confirms with token_hash_new: the suffix does not mean the new address.
      if (!data.token_hash_new) return [toNew];
      return [
        {
          kind: "emailChangeCurrent",
          to: user.email,
          locale,
          newEmail,
          link: verify(data.token_hash_new),
        },
        toNew,
      ];
    }
    default:
      return null;
  }
}

function bookingIdFrom(redirectTo: string, siteUrl: string): string | null {
  if (!URL.canParse(redirectTo)) return null;
  const url = new URL(redirectTo);
  if (url.origin !== new URL(siteUrl).origin) return null;
  if (url.pathname !== "/auth/confirm") return null;
  const id = url.searchParams.get("booking");
  return id && uuid.test(id) ? id : null;
}
