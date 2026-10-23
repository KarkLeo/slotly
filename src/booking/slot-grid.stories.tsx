import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { groupSlots } from "./dates";
import { SlotGrid } from "./slot-grid";

const slots = [
  "06:00",
  "06:30",
  "07:30",
  "08:45",
  "09:00",
  "13:00",
  "15:00",
].map((time) => `2026-10-29T${time}:00+00:00`);

const meta = {
  title: "Booking/SlotGrid",
  component: SlotGrid,
  args: {
    groups: groupSlots(slots, "Europe/Kyiv", "uk"),
    selected: null,
    onSelect: fn(),
    label: "Час",
  },
} satisfies Meta<typeof SlotGrid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getAllByRole("radio")).toHaveLength(7);
    await userEvent.click(canvas.getByRole("radio", { name: "10:45" }));
    await expect(args.onSelect).toHaveBeenCalledWith(
      "2026-10-29T08:45:00+00:00",
    );
  },
};

export const Selected: Story = {
  args: { selected: "2026-10-29T13:00:00+00:00" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radio", { name: "15:00" })).toBeChecked();
  },
};

export const Russian: Story = { ...Default, globals: { locale: "ru" } };

export const English: Story = { ...Default, globals: { locale: "en" } };
