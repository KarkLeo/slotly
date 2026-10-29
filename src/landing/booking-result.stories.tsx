import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { isLocale } from "@/i18n/locales";
import { BookingDone, BookingExpired, BookingFailed } from "./booking-result";

const dictionaries = { uk, ru, en };

const texts = (locale: unknown) =>
  dictionaries[isLocale(locale) ? locale : "uk"].Landing;

const plain = (message: string) => message.replace(/<\/?\w+>/g, "");

const meta = {
  title: "Landing/BookingResult",
  component: BookingDone,
  parameters: { layout: "fullscreen" },
  args: {
    status: "confirmed",
    bookingHref: "/app/bookings/appointment-1",
    summary: {
      service: "Манікюр з покриттям",
      when: "чт, 29 жовтня о 11:45",
      zone: "за східноєвропейським часом",
      price: { kind: "fixed", amount: "900 ₴" },
    },
    cancelUntil: "чт, 28 жовтня о 23:45",
    onClose: fn(),
  },
} satisfies Meta<typeof BookingDone>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Confirmed: Story = {
  play: async ({ canvas, args, userEvent, globals }) => {
    const t = texts(globals.locale);
    await expect(
      canvas.getByRole("heading", { level: 1, name: plain(t.doneTitle) }),
    ).toBeVisible();
    await expect(
      canvas.getByText(
        t.cancelUntil.replace("{date}", "чт, 28 жовтня о 23:45"),
      ),
    ).toBeVisible();
    await expect(canvas.queryByText(t.awaitingMaster)).toBeNull();
    await expect(
      canvas.getByRole("link", { name: t.addToCalendar }),
    ).toHaveAttribute("href", "/app/bookings/appointment-1/calendar");
    await expect(
      canvas.getByRole("link", { name: t.myBookings }),
    ).toHaveAttribute("href", "/app/bookings");
    await userEvent.click(canvas.getByRole("button", { name: t.close }));
    await expect(args.onClose).toHaveBeenCalled();
  },
};

export const Russian: Story = { ...Confirmed, globals: { locale: "ru" } };

export const English: Story = { ...Confirmed, globals: { locale: "en" } };

export const AwaitingMaster: Story = {
  args: { status: "awaitingMaster" },
  play: async ({ canvas, globals }) => {
    const t = texts(globals.locale);
    await expect(
      canvas.getByRole("heading", { level: 1, name: plain(t.requestedTitle) }),
    ).toBeVisible();
    await expect(canvas.getByText(t.awaitingMaster)).toBeVisible();
  },
};

export const CancelClosed: Story = {
  args: { cancelUntil: null },
  play: async ({ canvas, globals }) => {
    await expect(
      canvas.getByText(texts(globals.locale).cancelClosed),
    ).toBeVisible();
  },
};

export const Expired: Story = {
  render: () => (
    <BookingExpired when="чт, 29 жовтня о 11:45" onRestart={fn()} />
  ),
  play: async ({ canvas, globals }) => {
    const t = texts(globals.locale);
    await expect(
      canvas.getByRole("heading", { level: 1, name: plain(t.expiredTitle) }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: t.chooseAgain }),
    ).toBeEnabled();
  },
};

export const Failed: Story = {
  render: () => <BookingFailed onRetry={fn()} />,
  play: async ({ canvas, globals }) => {
    const t = texts(globals.locale);
    await expect(
      canvas.getByRole("heading", { level: 1, name: plain(t.failedTitle) }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: t.tryAgain }),
    ).toBeEnabled();
  },
};
