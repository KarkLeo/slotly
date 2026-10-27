import { describe, expect, it } from "vitest";
import { slotDateTimeLabel, slotTimeLabel, zoneLabel } from "@/booking/dates";
import { formatDuration, formatMoney } from "@/landing/format";
import type { AuthEmail, BookingDetails } from "./auth-emails";
import { renderAuthEmail, renderNotificationEmail } from "./render";

const booking: BookingDetails = {
  master: "Olena",
  service: { uk: "Манікюр", en: "Manicure" },
  primaryLocale: "uk",
  locale: "en",
  startsAt: "2030-01-10T10:00:00Z",
  endsAt: "2030-01-10T11:30:00Z",
  timeZone: "Europe/Warsaw",
  priceKind: "from",
  price: 450,
  currency: "PLN",
  address: "Main St 1 <b>",
  holdUntil: "2030-01-09T10:15:00Z",
};

const link =
  "https://slotly.example/auth/confirm?booking=1&token_hash=h&type=email";

function bookingEmail(details: Partial<BookingDetails> = {}): AuthEmail {
  const merged = { ...booking, ...details };
  return {
    kind: "booking",
    to: "mark@example.com",
    locale: merged.locale,
    link,
    code: "123456",
    booking: merged,
  };
}

describe("renderAuthEmail", () => {
  it("shows the booking details in the booking's language and the master's zone", async () => {
    const email = await renderAuthEmail(bookingEmail());
    expect(email.to).toBe("mark@example.com");
    expect(email.subject).toBe("Confirm your booking on Slotly");
    expect(email.html).toContain('lang="en"');
    for (const value of [
      "Olena",
      "Manicure",
      `${slotDateTimeLabel(booking.startsAt, "Europe/Warsaw", "en")} (${zoneLabel("Europe/Warsaw", "en")})`,
      formatDuration(90, "en"),
      `from ${formatMoney(450, "PLN", "en")}`,
      "Main St 1 &lt;b&gt;",
      "123456",
      slotTimeLabel(booking.holdUntil, "Europe/Warsaw", "en"),
      link.replaceAll("&", "&amp;"),
    ])
      expect(email.html).toContain(value);
    expect(email.text).toContain("123456");
    expect(email.text).toContain("Manicure");
    expect(email.text).toContain(link);
  });

  it("falls back to the master's language for the service name", async () => {
    const email = await renderAuthEmail(
      bookingEmail({ locale: "ru", service: { uk: "Манікюр" } }),
    );
    expect(email.subject).toBe("Подтвердите запись в Slotly");
    expect(email.html).toContain("Манікюр");
  });

  it("leaves out the price and the address when the booking has none", async () => {
    const email = await renderAuthEmail(
      bookingEmail({ priceKind: "none", price: null, address: null }),
    );
    expect(email.html).not.toContain(">Price<");
    expect(email.html).not.toContain(">Address for the visit<");
  });

  it("shows a fixed price without a prefix", async () => {
    const email = await renderAuthEmail(bookingEmail({ priceKind: "fixed" }));
    expect(email.html).toContain(formatMoney(450, "PLN", "en"));
    expect(email.html).not.toContain("from ");
  });

  it("sends a sign-in code without booking details", async () => {
    const email = await renderAuthEmail({
      kind: "signIn",
      to: "mark@example.com",
      locale: "ru",
      code: "123456",
      link: "https://slotly.example/auth/confirm?token_hash=h&type=email",
    });
    expect(email.subject).toBe("Вход в Slotly");
    expect(email.html).toContain("Код: 123456");
    expect(email.html).toContain("Войти");
    expect(email.html).not.toContain("Мастер");
  });

  it("confirms a new address by link only", async () => {
    const email = await renderAuthEmail({
      kind: "emailChangeNew",
      to: "new@example.com",
      locale: "uk",
      newEmail: "new@example.com",
      link: "https://db.example/auth/v1/verify?type=email_change&token=h",
    });
    expect(email.subject).toBe("Підтвердіть новий email у Slotly");
    expect(email.html).toContain("new@example.com");
    expect(email.html).not.toContain("Код:");
  });
});

describe("renderNotificationEmail", () => {
  it("shows the message with its comment and every action", async () => {
    const email = await renderNotificationEmail(
      {
        subject: "Запис відхилено",
        title: "Запис відхилено",
        intro: "Майстер не може прийняти вас у цей час.",
        details: [{ label: "Майстер", value: "Olena" }],
        comment: { label: "Коментар майстра", text: "Хворію <b>" },
        actions: [
          {
            label: "Записатися на інший час",
            url: "https://slotly.example/olena",
          },
          { label: "Керувати записом", url: "https://slotly.example/l?t=1" },
        ],
        note: null,
      },
      "mark@example.com",
      "uk",
    );
    expect(email.to).toBe("mark@example.com");
    expect(email.subject).toBe("Запис відхилено");
    expect(email.html).toContain('lang="uk"');
    expect(email.html).toContain("Хворію &lt;b&gt;");
    expect(email.html).toContain('href="https://slotly.example/olena"');
    expect(email.html).toContain('href="https://slotly.example/l?t=1"');
    expect(email.text).toContain("Коментар майстра");
    expect(email.text).toContain("Керувати записом");
  });
});
