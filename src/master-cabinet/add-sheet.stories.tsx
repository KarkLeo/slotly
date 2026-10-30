import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  expect,
  screen,
  spyOn,
  userEvent,
  waitFor,
  within,
} from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { Button } from "@/components/ui/button";
import { overflowsX } from "@/components/ui/story-helpers";
import { isLocale, type Locale } from "@/i18n/locales";
import { AddSheet } from "./add-sheet";
import { newBlockHref, newBookingHref } from "./sections";

const dictionaries = { uk, ru, en };

const textsOf = (locale: unknown) =>
  dictionaries[isLocale(locale) ? (locale as Locale) : "uk"].MasterCabinet;

const meta = {
  title: "MasterCabinet/AddSheet",
  component: AddSheet,
  globals: { viewport: { value: "mobile360" } },
  args: { trigger: <Button>Open</Button> },
} satisfies Meta<typeof AddSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Open: Story = {
  play: async ({ canvas, globals }) => {
    const t = textsOf(globals.locale);
    const consoleError = spyOn(console, "error");
    await userEvent.click(canvas.getByRole("button", { name: "Open" }));
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
    await expect(overflowsX(dialog)).toBe(false);
    for (const link of within(dialog).getAllByRole("link"))
      await expect(link).not.toHaveAttribute("type");
    await userEvent.click(
      within(dialog).getByRole("link", { name: t.add.block }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining("nativeButton"),
    );
    consoleError.mockRestore();
  },
};

export const Russian: Story = { ...Open, globals: { locale: "ru" } };

export const English: Story = { ...Open, globals: { locale: "en" } };
