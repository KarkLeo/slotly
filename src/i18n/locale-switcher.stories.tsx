import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked } from "storybook/test";
import { setLocale } from "./actions";
import { LocaleSwitcher } from "./locale-switcher";

const meta = {
  title: "I18n/LocaleSwitcher",
  component: LocaleSwitcher,
  beforeEach: () => {
    mocked(setLocale).mockReset();
    mocked(setLocale).mockResolvedValue(undefined);
  },
} satisfies Meta<typeof LocaleSwitcher>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.selectOptions(canvas.getByRole("combobox"), "en");
    await expect(setLocale).toHaveBeenCalledWith("en");
  },
};
