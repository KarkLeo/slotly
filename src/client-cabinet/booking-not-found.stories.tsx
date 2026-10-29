import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { isLocale } from "@/i18n/locales";
import { BookingNotFound } from "./booking-not-found";

const dictionaries = { uk, ru, en };

const plain = (message: string) => message.replace(/<\/?\w+>/g, "");

const meta = {
  title: "ClientCabinet/BookingNotFound",
  component: BookingNotFound,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof BookingNotFound>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, globals }) => {
    const t =
      dictionaries[isLocale(globals.locale) ? globals.locale : "uk"].MyBookings;
    await expect(
      canvas.getByRole("heading", { level: 1, name: plain(t.notFoundTitle) }),
    ).toBeVisible();
    await expect(canvas.getByRole("link", { name: t.toList })).toHaveAttribute(
      "href",
      "/app/bookings",
    );
  },
};

export const Russian: Story = { ...Default, globals: { locale: "ru" } };

export const English: Story = { ...Default, globals: { locale: "en" } };
