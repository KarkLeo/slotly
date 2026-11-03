import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { isLocale } from "@/i18n/locales";
import { LandingUnavailable } from "./landing-unavailable";

const dictionaries = { uk, ru, en };

const meta = {
  title: "Landing/Unavailable",
  component: LandingUnavailable,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "mobile360" } },
} satisfies Meta<typeof LandingUnavailable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, globals }) => {
    const t =
      dictionaries[isLocale(globals.locale) ? globals.locale : "uk"].Landing;
    await expect(
      canvas.getByRole("heading", { level: 1, name: t.unavailableTitle }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: t.notFoundHome }),
    ).toHaveAttribute("href", "/");
  },
};

export const Russian: Story = { ...Default, globals: { locale: "ru" } };

export const English: Story = { ...Default, globals: { locale: "en" } };

export const Dark: Story = { ...Default, globals: { theme: "dark" } };
