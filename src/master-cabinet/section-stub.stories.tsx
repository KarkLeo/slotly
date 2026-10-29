import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { usePathname } from "next/navigation";
import { expect, mocked, screen, within } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { overflowsX } from "@/components/ui/story-helpers";
import { isLocale, type Locale } from "@/i18n/locales";
import { newBlockHref, newBookingHref } from "./sections";
import { SectionStub } from "./section-stub";

const dictionaries = { uk, ru, en };

const textsOf = (locale: unknown) =>
  dictionaries[isLocale(locale) ? (locale as Locale) : "uk"].MasterCabinet;

const meta = {
  title: "MasterCabinet/SectionStub",
  component: SectionStub,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "mobile360" } },
  args: { section: "today", theme: "system", email: "master@example.com" },
} satisfies Meta<typeof SectionStub>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Services: Story = {
  args: { section: "services" },
  beforeEach: () => {
    mocked(usePathname).mockReturnValue("/app/services");
  },
  play: async ({ canvas, userEvent, globals }) => {
    const t = textsOf(globals.locale);
    await expect(
      canvas.getByRole("heading", { level: 1, name: t.sections.services }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: t.back }));
    await screen.findByRole("dialog", { name: t.more });
    await expect(overflowsX(document.documentElement)).toBe(false);
  },
};

export const Today: Story = {
  args: { section: "today" },
  globals: { viewport: { value: "desktop1280" } },
  beforeEach: () => {
    mocked(usePathname).mockReturnValue("/app");
  },
  play: async ({ canvas, globals }) => {
    const t = textsOf(globals.locale);
    await expect(
      canvas.queryByRole("button", { name: t.back }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByRole("link", { name: t.add.block }),
    ).toHaveAttribute("href", newBlockHref);
    await expect(
      canvas.getByRole("link", { name: t.add.booking }),
    ).toHaveAttribute("href", newBookingHref);
    await expect(canvas.getByRole("link", { name: t.add.block })).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: t.add.booking }),
    ).toBeVisible();
  },
};

export const TodayPhone: Story = {
  args: { section: "today" },
  beforeEach: () => {
    mocked(usePathname).mockReturnValue("/app");
  },
  play: async ({ canvas, globals }) => {
    const t = textsOf(globals.locale);
    await expect(
      canvas.getByRole("link", { name: t.add.block, hidden: true }),
    ).not.toBeVisible();
    await expect(
      canvas.getByRole("link", { name: t.add.booking, hidden: true }),
    ).not.toBeVisible();
  },
};

export const NewBooking: Story = {
  args: { section: "newBooking" },
  beforeEach: () => {
    mocked(usePathname).mockReturnValue("/app/appointments/new");
  },
  play: async ({ canvas, globals }) => {
    const t = textsOf(globals.locale);
    await expect(
      canvas.queryByRole("button", { name: t.back }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByRole("heading", { level: 1, name: t.add.booking }),
    ).toBeVisible();
    await expect(
      within(document.body).getByRole("heading", { level: 2 }),
    ).toBeVisible();
  },
};

export const Russian: Story = { ...Services, globals: { locale: "ru" } };

export const English: Story = { ...Services, globals: { locale: "en" } };
