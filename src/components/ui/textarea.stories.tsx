import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Label } from "./label";
import { computedColor, resolvedColor } from "./story-helpers";
import { Textarea } from "./textarea";

const meta = {
  title: "UI/Inputs/Textarea",
  component: Textarea,
  args: { id: "notes", placeholder: "Anything the master should know" },
  render: (args) => (
    <div className="flex flex-col gap-2 p-4">
      <Label htmlFor="notes">Notes</Label>
      <Textarea {...args} />
    </div>
  ),
} satisfies Meta<typeof Textarea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const textarea = canvas.getByLabelText("Notes");
    await expect(getComputedStyle(textarea).fontSize).toBe("16px");
    await expect(computedColor(textarea, "borderTopColor")).toBe(
      resolvedColor("border-input", "borderTopColor"),
    );
    await expect(computedColor(textarea)).toBe(resolvedColor("bg-background"));
  },
};

export const Invalid: Story = {
  args: { "aria-invalid": true },
  play: async ({ canvas }) => {
    await expect(
      computedColor(canvas.getByLabelText("Notes"), "borderTopColor"),
    ).toBe(resolvedColor("border-destructive", "borderTopColor"));
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Notes")).toBeDisabled();
  },
};
