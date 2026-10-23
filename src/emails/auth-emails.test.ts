import { describe, expect, it, vi } from "vitest";
import { authEmails, type BookingDetails } from "./auth-emails";

const siteUrl = "https://slotly.example";
const supabaseUrl = "https://db.example";
const bookingId = "6f1c1d36-3f0b-4f43-9d55-3c3a3b9e8a10";

const booking: BookingDetails = {
  master: "Olena",
  service: { uk: "Манікюр", en: "Manicure" },
  primaryLocale: "uk",
  locale: "en",
  startsAt: "2030-01-10T10:00:00Z",
  endsAt: "2030-01-10T11:30:00Z",
  timeZone: "Europe/Kyiv",
  priceKind: "fixed",
  price: 450,
  currency: "UAH",
  address: null,
  holdUntil: "2030-01-09T10:15:00Z",
};

function payload(
  type: string,
  {
    redirectTo = siteUrl,
    locale = "ru" as unknown,
    tokenNew = "",
    tokenHashNew = "",
    newEmail = undefined as string | undefined,
  } = {},
) {
  return {
    user: {
      email: "mark@example.com",
      new_email: newEmail,
      user_metadata: { locale },
    },
    email_data: {
      token: "123456",
      token_hash: "hash",
      token_new: tokenNew,
      token_hash_new: tokenHashNew,
      redirect_to: redirectTo,
      email_action_type: type,
      site_url: siteUrl,
    },
  };
}

function build(
  body: unknown,
  loadBooking = vi.fn(async () => booking as BookingDetails | null),
) {
  return authEmails(body, { siteUrl, supabaseUrl, loadBooking });
}

const bookingRedirect = `${siteUrl}/auth/confirm?booking=${bookingId}`;

describe("authEmails", () => {
  it("sends a sign-in code in the user's language", async () => {
    await expect(build(payload("magiclink"))).resolves.toEqual([
      {
        kind: "signIn",
        to: "mark@example.com",
        locale: "ru",
        code: "123456",
        link: `${siteUrl}/auth/confirm?token_hash=hash&type=email`,
      },
    ]);
  });

  it("falls back to Ukrainian without a known language", async () => {
    const [email] = (await build(payload("magiclink", { locale: "de" })))!;
    expect(email.locale).toBe("uk");
  });

  it("asks a new user to confirm the email", async () => {
    const [email] = (await build(payload("signup")))!;
    expect(email).toMatchObject({ kind: "signUp", code: "123456" });
  });

  it.each(["magiclink", "signup"])(
    "shows the booking in its language when a %s email names it",
    async (type) => {
      const loadBooking = vi.fn(async () => booking);
      const emails = await build(
        payload(type, { redirectTo: bookingRedirect }),
        loadBooking,
      );
      expect(loadBooking).toHaveBeenCalledWith(bookingId, "mark@example.com");
      expect(emails).toEqual([
        {
          kind: "booking",
          to: "mark@example.com",
          locale: "en",
          code: "123456",
          link: `${siteUrl}/auth/confirm?booking=${bookingId}&token_hash=hash&type=email`,
          booking,
        },
      ]);
    },
  );

  it("sends a plain sign-in that still names the booking when it no longer waits for this email", async () => {
    const [email] = (await build(
      payload("magiclink", { redirectTo: bookingRedirect }),
      vi.fn(async () => null),
    ))!;
    expect(email).toMatchObject({
      kind: "signIn",
      link: `${siteUrl}/auth/confirm?booking=${bookingId}&token_hash=hash&type=email`,
    });
  });

  it("still sends the code when the booking details fail to load", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const [email] = (await build(
      payload("signup", { redirectTo: bookingRedirect }),
      vi.fn(async () => {
        throw new Error("timeout");
      }),
    ))!;
    expect(email).toMatchObject({
      kind: "signUp",
      code: "123456",
      link: `${siteUrl}/auth/confirm?booking=${bookingId}&token_hash=hash&type=email`,
    });
  });

  it.each([
    `https://evil.example/auth/confirm?booking=${bookingId}`,
    `${siteUrl}/elsewhere?booking=${bookingId}`,
    `${siteUrl}/auth/confirm?booking=not-a-uuid`,
    "not a url",
  ])("ignores a booking in %s", async (redirectTo) => {
    const loadBooking = vi.fn(async () => booking);
    const [email] = (await build(
      payload("magiclink", { redirectTo }),
      loadBooking,
    ))!;
    expect(loadBooking).not.toHaveBeenCalled();
    expect(email.kind).toBe("signIn");
  });

  it("asks both addresses to confirm a secure email change", async () => {
    const emails = await build(
      payload("email_change", {
        newEmail: "new@example.com",
        tokenNew: "654321",
        tokenHashNew: "hash-new",
      }),
    );
    const verify = `${supabaseUrl}/auth/v1/verify?type=email_change&redirect_to=${encodeURIComponent(siteUrl)}`;
    expect(emails).toEqual([
      {
        kind: "emailChangeCurrent",
        to: "mark@example.com",
        locale: "ru",
        newEmail: "new@example.com",
        link: `${verify}&token=hash-new`,
      },
      {
        kind: "emailChangeNew",
        to: "new@example.com",
        locale: "ru",
        newEmail: "new@example.com",
        link: `${verify}&token=hash`,
      },
    ]);
  });

  it("asks only the new address when the change needs one confirmation", async () => {
    const emails = await build(
      payload("email_change", { newEmail: "new@example.com" }),
    );
    expect(emails).toEqual([
      expect.objectContaining({
        kind: "emailChangeNew",
        to: "new@example.com",
        link: expect.stringContaining("&token=hash"),
      }),
    ]);
  });

  it("refuses email types the app does not send and malformed payloads", async () => {
    await expect(build(payload("recovery"))).resolves.toBeNull();
    await expect(
      build(payload("email_change", { newEmail: undefined })),
    ).resolves.toBeNull();
    await expect(build({ user: {} })).resolves.toBeNull();
  });
});
