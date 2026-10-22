import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { toast } from "sonner";
import { expect, mocked, screen, waitFor } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { boxHeight } from "@/components/ui/story-helpers";
import { Toaster } from "@/components/ui/sonner";
import { setTheme } from "./actions";
import { ThemeSwitcher } from "./theme-switcher";

const dictionaries = { uk, ru, en };

function texts(locale: unknown) {
  return dictionaries[locale === "ru" || locale === "en" ? locale : "uk"];
}

const meta = {
  title: "Theme/ThemeSwitcher",
  component: ThemeSwitcher,
  args: { theme: "system" },
  render: (args) => (
    <div className="p-4">
      <Toaster />
      <ThemeSwitcher {...args} />
    </div>
  ),
  beforeEach: () => {
    mocked(setTheme).mockReset();
  },
  afterEach: () => {
    toast.dismiss();
  },
} satisfies Meta<typeof ThemeSwitcher>;

export default meta;

type Story = StoryObj<typeof meta>;

export const System: Story = {
  beforeEach: () => {
    let release = () => {};
    mocked(setTheme).mockImplementation(
      () => new Promise<void>((resolve) => (release = resolve)),
    );
    return () => release();
  },
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale).ThemeSwitcher;
    const group = canvas.getByRole("group", { name: t.label });
    const system = canvas.getByRole("button", { name: t.system });
    const dark = canvas.getByRole("button", { name: t.dark });
    await expect(group).toBeVisible();
    await expect(boxHeight(system)).toBe(44);
    await expect(system).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(dark);
    await expect(setTheme).toHaveBeenCalledWith("dark");
    // The choice shows at once, before the server answers.
    await expect(dark).toHaveAttribute("aria-pressed", "true");
    await expect(system).toHaveAttribute("aria-pressed", "false");
  },
};

export const Light: Story = {
  args: { theme: "light" },
  play: async ({ canvas, globals }) => {
    const t = texts(globals.locale).ThemeSwitcher;
    await expect(canvas.getByRole("button", { name: t.light })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  },
};

export const Dark: Story = {
  args: { theme: "dark" },
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale).ThemeSwitcher;
    const dark = canvas.getByRole("button", { name: t.dark });
    await expect(dark).toHaveAttribute("aria-pressed", "true");
    // Pressing the chosen theme again keeps it instead of leaving nothing chosen.
    await userEvent.click(dark);
    await expect(dark).toHaveAttribute("aria-pressed", "true");
    await expect(setTheme).not.toHaveBeenCalled();
  },
};

export const ServerThrows: Story = {
  beforeEach: () => {
    mocked(setTheme).mockRejectedValue(new Error("Network error"));
  },
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale);
    const system = canvas.getByRole("button", { name: t.ThemeSwitcher.system });
    await userEvent.click(
      canvas.getByRole("button", { name: t.ThemeSwitcher.light }),
    );
    await waitFor(() =>
      expect(screen.getByText(t.Toasts.unexpected)).toBeVisible(),
    );
    await waitFor(() => expect(system).toHaveAttribute("aria-pressed", "true"));
  },
};
