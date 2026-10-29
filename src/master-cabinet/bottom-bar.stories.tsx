import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { usePathname } from "next/navigation";
import { expect, mocked, screen, waitFor, within } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { overflowsX } from "@/components/ui/story-helpers";
import { isLocale, type Locale } from "@/i18n/locales";
import { BottomBar } from "./bottom-bar";
import { newBlockHref, newBookingHref } from "./sections";

const dictionaries = { uk, ru, en };

const textsOf = (locale: unknown) =>
  dictionaries[isLocale(locale) ? (locale as Locale) : "uk"].MasterCabinet;

const meta = {
  title: "MasterCabinet/BottomBar",
  component: BottomBar,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "mobile360" } },
  args: { theme: "system", email: "master@example.com" },
} satisfies Meta<typeof BottomBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Today: Story = {
  beforeEach: () => {
    mocked(usePathname).mockReturnValue("/app");
  },
  play: async ({ canvas, globals }) => {
    const t = textsOf(globals.locale);
    const nav = canvas.getByRole("navigation", { name: t.navigation });
    await expect(
      within(nav).getByRole("link", { name: t.sections.today }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      within(nav).getByRole("link", { name: t.sections.clients }),
    ).not.toHaveAttribute("aria-current");
    await expect(overflowsX(nav)).toBe(false);
  },
};

export const InMore: Story = {
  beforeEach: () => {
    mocked(usePathname).mockReturnValue("/app/services");
  },
  play: async ({ canvas, globals }) => {
    const t = textsOf(globals.locale);
    const nav = canvas.getByRole("navigation", { name: t.navigation });
    await expect(
      within(nav).getByRole("button", { name: t.more }),
    ).toHaveAttribute("data-active");
    await expect(
      within(nav).queryAllByRole("link", { current: "page" }),
    ).toHaveLength(0);
  },
};

export const AddOpen: Story = {
  beforeEach: () => {
    mocked(usePathname).mockReturnValue("/app");
  },
  play: async ({ canvas, userEvent, globals }) => {
    const t = textsOf(globals.locale);
    await userEvent.click(canvas.getByRole("button", { name: t.add.title }));
    const dialog = await screen.findByRole("dialog", { name: t.add.title });
    await waitFor(() =>
      expect(
        within(dialog).getByRole("link", { name: t.add.booking }),
      ).toBeVisible(),
    );
    await expect(
      within(dialog).getByRole("link", { name: t.add.booking }),
    ).toHaveAttribute("href", newBookingHref);
    await expect(
      within(dialog).getByRole("link", { name: t.add.block }),
    ).toHaveAttribute("href", newBlockHref);
  },
};

export const Russian: Story = { ...Today, globals: { locale: "ru" } };

export const English: Story = { ...Today, globals: { locale: "en" } };
