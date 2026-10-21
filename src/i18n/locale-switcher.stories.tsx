import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, screen } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { boxHeight } from "@/components/ui/story-helpers";
import { setLocale } from "./actions";
import { LocaleSwitcher } from "./locale-switcher";

const dictionaries = { uk, ru, en };

function texts(locale: unknown) {
  return dictionaries[locale === "ru" || locale === "en" ? locale : "uk"]
    .LocaleSwitcher;
}

const meta = {
  title: "I18n/LocaleSwitcher",
  component: LocaleSwitcher,
  beforeEach: () => {
    mocked(setLocale).mockReset();
  },
} satisfies Meta<typeof LocaleSwitcher>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale);
    const trigger = canvas.getByRole("combobox", { name: t.label });
    await expect(boxHeight(trigger)).toBe(44);
    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole("option", { name: t.en }));
    await expect(setLocale).toHaveBeenCalledWith("en");
  },
};

export const LabelFocusesSelect: Story = {
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale);
    await userEvent.click(canvas.getByText(t.label));
    await expect(canvas.getByRole("combobox", { name: t.label })).toHaveFocus();
  },
};
