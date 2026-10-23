import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor } from "storybook/test";
import en from "../../messages/emails/en.json";
import ru from "../../messages/emails/ru.json";
import uk from "../../messages/emails/uk.json";
import { isLocale, type Locale } from "@/i18n/locales";
import type { AuthEmail, BookingDetails } from "./auth-emails";
import { renderAuthEmail, type RenderedEmail } from "./render";

const dictionaries = { uk, ru, en };

const localeOf = (value: unknown): Locale => (isLocale(value) ? value : "uk");

type Draft =
  | Omit<Extract<AuthEmail, { kind: "signIn" | "signUp" }>, "locale" | "to">
  | Omit<Extract<AuthEmail, { kind: "booking" }>, "locale" | "to">
  | Omit<
      Extract<AuthEmail, { kind: "emailChangeNew" | "emailChangeCurrent" }>,
      "locale" | "to"
    >;

const booking: BookingDetails = {
  master: "Олена Мельник",
  service: { uk: "Манікюр з покриттям", en: "Gel manicure" },
  primaryLocale: "uk",
  locale: "uk",
  startsAt: "2026-10-29T09:45:00Z",
  endsAt: "2026-10-29T11:15:00Z",
  timeZone: "Europe/Kyiv",
  priceKind: "fixed",
  price: 900,
  currency: "UAH",
  address: "вул. Хрещатик, 12, кв. 5",
  holdUntil: "2026-10-23T15:20:00Z",
};

const link = "https://slotly.karkleo.com/auth/confirm?token_hash=x&type=email";

function EmailPreview({ email }: { email: RenderedEmail }) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <p className="text-sm text-muted-foreground">{email.to}</p>
      <p className="font-semibold">{email.subject}</p>
      <iframe
        title={email.subject}
        srcDoc={email.html}
        className="h-[720px] w-full rounded-xl border border-border"
      />
    </div>
  );
}

const meta = {
  title: "Emails/AuthEmail",
  parameters: { layout: "fullscreen" },
  args: { draft: { kind: "signIn", code: "384829", link } as Draft },
  loaders: [
    async ({ args, globals }) => {
      const { draft } = args;
      const locale = localeOf(globals.locale);
      const email = (
        draft.kind === "booking"
          ? {
              ...draft,
              to: "mark@example.com",
              locale,
              booking: { ...draft.booking, locale },
            }
          : { ...draft, to: "mark@example.com", locale }
      ) as AuthEmail;
      return { email: await renderAuthEmail(email) };
    },
  ],
  render: (_args, { loaded }) => (
    <EmailPreview email={(loaded as { email: RenderedEmail }).email} />
  ),
} satisfies Meta<{ draft: Draft }>;

export default meta;

type Story = StoryObj<{ draft: Draft }>;

async function emailBody(canvasElement: HTMLElement) {
  const frame = canvasElement.querySelector("iframe")!;
  await waitFor(() =>
    expect(frame.contentDocument?.body.textContent).toBeTruthy(),
  );
  return frame.contentDocument!.body;
}

export const Booking: Story = {
  args: { draft: { kind: "booking", code: "384829", link, booking } },
  play: async ({ canvasElement, globals }) => {
    const t = dictionaries[localeOf(globals.locale)].booking;
    const body = await emailBody(canvasElement);
    for (const text of [
      t.title,
      t.master,
      "Олена Мельник",
      t.address,
      booking.address!,
      "384829",
    ])
      await expect(body.textContent).toContain(text);
  },
};

export const BookingRussian: Story = {
  ...Booking,
  globals: { locale: "ru" },
};

export const BookingEnglish: Story = {
  ...Booking,
  globals: { locale: "en" },
};

export const BookingWithoutPriceOrAddress: Story = {
  args: {
    draft: {
      kind: "booking",
      code: "384829",
      link,
      booking: { ...booking, priceKind: "none", price: null, address: null },
    },
  },
  play: async ({ canvasElement, globals }) => {
    const t = dictionaries[localeOf(globals.locale)].booking;
    const body = await emailBody(canvasElement);
    await expect(body.textContent).not.toContain(t.price);
    await expect(body.textContent).not.toContain(t.address);
  },
};

export const BookingLongTexts: Story = {
  args: {
    draft: {
      kind: "booking",
      code: "384829",
      link,
      booking: {
        ...booking,
        master: "Олександра-Вікторія Шевченко-Коваленко",
        service: {
          uk: "Комплексний догляд: манікюр, педикюр, парафінотерапія і масаж рук",
        },
        priceKind: "from",
        price: 12500.5,
        address:
          "вул. Велика Васильківська, 128, під’їзд 3, поверх 14, квартира 287, домофон 287В",
      },
    },
  },
};

export const SignIn: Story = {
  play: async ({ canvasElement, globals }) => {
    const t = dictionaries[localeOf(globals.locale)].signIn;
    const body = await emailBody(canvasElement);
    await expect(body.textContent).toContain(t.title);
    await expect(body.textContent).toContain("384829");
  },
};

export const SignUp: Story = {
  args: { draft: { kind: "signUp", code: "384829", link } },
};

export const EmailChangeNew: Story = {
  args: {
    draft: { kind: "emailChangeNew", newEmail: "new@example.com", link },
  },
  play: async ({ canvasElement }) => {
    const body = await emailBody(canvasElement);
    await expect(body.textContent).toContain("new@example.com");
  },
};

export const EmailChangeCurrent: Story = {
  args: {
    draft: { kind: "emailChangeCurrent", newEmail: "new@example.com", link },
  },
};
