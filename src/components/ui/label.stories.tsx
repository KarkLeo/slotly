import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Input } from "./input";
import { Label } from "./label";

const meta = {
  title: "UI/Inputs/Label",
  component: Label,
} satisfies Meta<typeof Label>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-col gap-2 p-4">
      <Label htmlFor="name">Your name</Label>
      <Input id="name" />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Your name")).toBeInTheDocument();
  },
};

export const WithDisabledPeer: Story = {
  render: () => (
    <div className="flex flex-col gap-2 p-4">
      <Input id="email" className="peer" disabled />
      <Label htmlFor="email">Email</Label>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(getComputedStyle(canvas.getByText("Email")).opacity).toBe(
      "0.5",
    );
  },
};
