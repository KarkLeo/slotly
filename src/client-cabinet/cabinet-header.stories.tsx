import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, waitFor, within } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { isLocale, type Locale } from "@/i18n/locales";
import { CabinetHeader } from "./cabinet-header";

const dictionaries = { uk, ru, en };

const localeOf = (value: unknown): Locale => (isLocale(value) ? value : "uk");

const meta = {
  title: "ClientCabinet/CabinetHeader",
  component: CabinetHeader,
  parameters: { layout: "fullscreen" },
  args: { theme: "system", isMaster: false },
} satisfies Meta<typeof CabinetHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent, globals }) => {
    const t = dictionaries[localeOf(globals.locale)];
    await expect(
      canvas.getByRole("link", { name: t.MyBookings.home }),
    ).toHaveAttribute("href", "/app/bookings");
    await userEvent.click(
      canvas.getByRole("button", { name: t.MyBookings.menu }),
    );
    const menu = await screen.findByRole("dialog", { name: t.MyBookings.menu });
    await waitFor(() =>
      expect(
        within(menu).getByRole("button", { name: t.Cabinet.signOut }),
      ).toBeVisible(),
    );
    await expect(within(menu).getByText(t.ThemeSwitcher.label)).toBeVisible();
    await expect(
      within(menu).queryByRole("link", { name: t.MyBookings.masterCabinet }),
    ).not.toBeInTheDocument();
  },
};

export const Master: Story = {
  args: { isMaster: true },
  play: async ({ canvas, userEvent, globals }) => {
    const t = dictionaries[localeOf(globals.locale)];
    await userEvent.click(
      canvas.getByRole("button", { name: t.MyBookings.menu }),
    );
    const menu = await screen.findByRole("dialog", { name: t.MyBookings.menu });
    await waitFor(() =>
      expect(
        within(menu).getByRole("link", { name: t.MyBookings.masterCabinet }),
      ).toHaveAttribute("href", "/app"),
    );
  },
};

export const Russian: Story = { ...Default, globals: { locale: "ru" } };

export const English: Story = { ...Default, globals: { locale: "en" } };
