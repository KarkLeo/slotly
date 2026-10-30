import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { usePathname } from "next/navigation";
import { expect, mocked, within } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { isLocale, type Locale } from "@/i18n/locales";
import { sections } from "./sections";
import { Sidebar } from "./sidebar";

const dictionaries = { uk, ru, en };

const dictionaryOf = (locale: unknown) =>
  dictionaries[isLocale(locale) ? (locale as Locale) : "uk"];

const meta = {
  title: "MasterCabinet/Sidebar",
  component: Sidebar,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop1280" } },
  args: { theme: "system", email: "master@example.com" },
  beforeEach: () => {
    mocked(usePathname).mockReturnValue("/app/calendar");
  },
} satisfies Meta<typeof Sidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  play: async ({ canvas, args, globals }) => {
    const t = dictionaryOf(globals.locale);
    const nav = canvas.getByRole("navigation", {
      name: t.MasterCabinet.navigation,
    });
    const links = within(nav).getAllByRole("link");
    await expect(links.map((l) => l.getAttribute("href"))).toEqual(
      sections.map((s) => s.href),
    );
    await expect(links.map((l) => l.textContent)).toEqual(
      sections.map((s) => t.MasterCabinet.sections[s.key]),
    );
    await expect(
      within(nav).getByRole("link", {
        name: t.MasterCabinet.sections.calendar,
      }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      canvas.getByRole("link", { name: t.MasterCabinet.clientRole }),
    ).toHaveAttribute("href", "/app/bookings");
    await expect(
      canvas.getByRole("button", { name: t.Cabinet.signOut }),
    ).toBeVisible();
    await expect(canvas.getByText(args.email!)).toBeVisible();
  },
};

export const Russian: Story = { ...Desktop, globals: { locale: "ru" } };

export const English: Story = { ...Desktop, globals: { locale: "en" } };

export const HiddenOnPhone: Story = {
  globals: { viewport: { value: "mobile390" } },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("aside")).not.toBeVisible();
  },
};
