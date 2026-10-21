import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Separator } from "./separator";

const meta = {
  title: "UI/Display/Separator",
  component: Separator,
} satisfies Meta<typeof Separator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="p-4">
      <p>Today</p>
      <Separator className="my-3" />
      <p>Tomorrow</p>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("separator")).toBeInTheDocument();
  },
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-6 items-center gap-3 p-4">
      <span>Day</span>
      <Separator orientation="vertical" />
      <span>Week</span>
    </div>
  ),
};
