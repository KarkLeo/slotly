import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { usePathname } from "next/navigation";
import { expect, mocked, screen, waitFor } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { Button } from "@/components/ui/button";
import { overflowsX } from "@/components/ui/story-helpers";
import { isLocale, type Locale } from "@/i18n/locales";
import { PageHeader } from "./page-header";

const dictionaries = { uk, ru, en };

const textsOf = (locale: unknown) =>
  dictionaries[isLocale(locale) ? (locale as Locale) : "uk"].MasterCabinet;

const meta = {
  title: "MasterCabinet/PageHeader",
  component: PageHeader,
  parameters: { layout: "padded" },
  globals: { viewport: { value: "mobile360" } },
  args: { title: "Today", subtitle: "Thursday, 29 October" },
  beforeEach: () => {
    mocked(usePathname).mockReturnValue("/app/services");
  },
} satisfies Meta<typeof PageHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Plain: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Today" }),
    ).toBeVisible();
    await expect(canvas.getByText("Thursday, 29 October")).toBeVisible();
    await expect(overflowsX(document.documentElement)).toBe(false);
  },
};

export const WithBack: Story = {
  args: { back: { theme: "system", email: "master@example.com" } },
  play: async ({ canvas, userEvent, globals }) => {
    const t = textsOf(globals.locale);
    await userEvent.click(canvas.getByRole("button", { name: t.back }));
    await screen.findByRole("dialog", { name: t.more });
  },
};

export const WithActions: Story = {
  args: {
    actions: (
      <>
        <Button variant="outline">Block time</Button>
        <Button>Book a client</Button>
      </>
    ),
  },
  globals: { viewport: { value: "desktop1280" } },
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Book a client" }),
      ).toBeVisible(),
    );
  },
};

export const LongTitle: Story = {
  args: {
    title: "A very long section title that has to wrap on a narrow screen",
    back: { theme: "system", email: null },
  },
  play: async ({ canvas }) => {
    await expect(overflowsX(canvas.getByRole("heading", { level: 1 }))).toBe(
      false,
    );
    await expect(overflowsX(document.documentElement)).toBe(false);
  },
};
