import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { computedColor, resolvedColor } from "./story-helpers";

const meta = {
  title: "UI/Display/Avatar",
  component: Avatar,
} satisfies Meta<typeof Avatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Fallback: Story = {
  render: () => (
    <div className="p-4">
      <Avatar>
        <AvatarFallback>AK</AvatarFallback>
      </Avatar>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(computedColor(canvas.getByText("AK"))).toBe(
      resolvedColor("bg-accent"),
    );
  },
};

export const BrokenImage: Story = {
  render: () => (
    <div className="p-4">
      <Avatar size="lg">
        <AvatarImage src="/missing-avatar.png" alt="Anna Kovalenko" />
        <AvatarFallback>AK</AvatarFallback>
      </Avatar>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("AK")).toBeVisible();
  },
};
