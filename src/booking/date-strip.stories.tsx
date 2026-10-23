import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { DateStrip } from "./date-strip";
import { horizonDates } from "./dates";

const dates = horizonDates("2026-10-28", 13).map((date) => ({
  date,
  available: !["2026-11-01", "2026-11-08"].includes(date),
}));

const meta = {
  title: "Booking/DateStrip",
  component: DateStrip,
  args: { dates, selected: null, onSelect: fn() },
} satisfies Meta<typeof DateStrip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, canvasElement, args, userEvent }) => {
    const page = canvasElement.ownerDocument.documentElement;
    // Only the strip scrolls sideways, never the page around it.
    await expect(page.scrollWidth).toBeLessThanOrEqual(page.clientWidth);

    const radios = canvas.getAllByRole("radio");
    await expect(radios).toHaveLength(14);
    await expect(radios[4]).toBeDisabled();
    await userEvent.click(radios[1]);
    await expect(args.onSelect).toHaveBeenCalledWith("2026-10-29");
  },
};

export const Selected: Story = {
  args: { selected: "2026-10-30" },
  play: async ({ canvas }) => {
    const checked = canvas
      .getAllByRole("radio")
      .filter((radio) => (radio as HTMLInputElement).checked);
    await expect(checked).toHaveLength(1);
    await expect(checked[0]).toHaveAttribute("value", "2026-10-30");
  },
};

export const Russian: Story = { ...Default, globals: { locale: "ru" } };

export const English: Story = { ...Default, globals: { locale: "en" } };
