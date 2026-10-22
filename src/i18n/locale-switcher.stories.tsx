import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { toast } from "sonner";
import { expect, mocked, screen, waitFor } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { Toaster } from "@/components/ui/sonner";
import { boxHeight } from "@/components/ui/story-helpers";
import { setLocale } from "./actions";
import { LocaleSwitcher } from "./locale-switcher";

const dictionaries = { uk, ru, en };

function texts(locale: unknown) {
  return dictionaries[locale === "ru" || locale === "en" ? locale : "uk"];
}

const meta = {
  title: "I18n/LocaleSwitcher",
  component: LocaleSwitcher,
  render: () => (
    <>
      <Toaster />
      <LocaleSwitcher />
    </>
  ),
  beforeEach: () => {
    mocked(setLocale).mockReset();
  },
  afterEach: () => {
    toast.dismiss();
  },
} satisfies Meta<typeof LocaleSwitcher>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale).LocaleSwitcher;
    const trigger = canvas.getByRole("combobox", { name: t.label });
    await expect(boxHeight(trigger)).toBe(44);
    const other = globals.locale === "en" ? "uk" : "en";
    await userEvent.click(trigger);
    await userEvent.click(
      await screen.findByRole("option", { name: t[other] }),
    );
    await expect(setLocale).toHaveBeenCalledWith(other);
    // The a11y check runs after play; let the list finish closing so its focus guards are gone.
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
  },
};

export const Russian: Story = { ...Default, globals: { locale: "ru" } };

export const English: Story = { ...Default, globals: { locale: "en" } };

export const LabelFocusesSelect: Story = {
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale).LocaleSwitcher;
    await userEvent.click(canvas.getByText(t.label));
    await expect(canvas.getByRole("combobox", { name: t.label })).toHaveFocus();
  },
};

export const ServerThrows: Story = {
  beforeEach: () => {
    mocked(setLocale).mockRejectedValue(new Error("Network error"));
  },
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale);
    const trigger = canvas.getByRole("combobox", {
      name: t.LocaleSwitcher.label,
    });
    await userEvent.click(trigger);
    await userEvent.click(
      await screen.findByRole("option", { name: t.LocaleSwitcher.en }),
    );
    await waitFor(() =>
      expect(screen.getByText(t.Toasts.unexpected)).toBeVisible(),
    );
    await waitFor(() => expect(trigger).not.toHaveAttribute("data-disabled"));
  },
};
