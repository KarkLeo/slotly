import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { isLocale } from "@/i18n/locales";
import { LandingNotFound } from "./landing-not-found";

const dictionaries = { uk, ru, en };

const meta = {
  title: "Landing/NotFound",
  component: LandingNotFound,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof LandingNotFound>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, globals }) => {
    const t =
      dictionaries[isLocale(globals.locale) ? globals.locale : "uk"].Landing;
    await expect(canvas.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: t.notFoundHome }),
    ).toHaveAttribute("href", "/");
  },
};

export const Russian: Story = { ...Default, globals: { locale: "ru" } };

export const English: Story = { ...Default, globals: { locale: "en" } };
