import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor } from "storybook/test";
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
    await new Promise((resolve) => {
      const image = new Image();
      image.onerror = resolve;
      image.src = "/missing-avatar.png";
    });
    await waitFor(() => expect(canvas.getByText("AK")).toBeVisible());
    await expect(canvas.queryByRole("img")).toBeNull();
  },
};

const pixel =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export const Loaded: Story = {
  render: () => (
    <div className="p-4">
      <Avatar size="lg">
        <AvatarImage src={pixel} alt="Anna Kovalenko" />
        <AvatarFallback>AK</AvatarFallback>
      </Avatar>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("img", { name: "Anna Kovalenko" }),
    ).toBeVisible();
    await waitFor(() => expect(canvas.queryByText("AK")).toBeNull());
  },
};
