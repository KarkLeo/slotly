import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Input } from "./input";
import { Label } from "./label";
import { boxHeight, computedColor, resolvedColor } from "./story-helpers";

const meta = {
  title: "UI/Inputs/Input",
  component: Input,
  args: { id: "phone", placeholder: "+380 67 000 00 00" },
  render: (args) => (
    <div className="flex flex-col gap-2 p-4">
      <Label htmlFor="phone">Phone</Label>
      <Input {...args} />
    </div>
  ),
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

async function expectFieldLook(input: HTMLElement) {
  await expect(getComputedStyle(input).fontSize).toBe("16px");
  await expect(computedColor(input, "borderTopColor")).toBe(
    resolvedColor("border-input", "borderTopColor"),
  );
  await expect(computedColor(input)).toBe(resolvedColor("bg-background"));
}

export const Default: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText("Phone");
    await expect(boxHeight(input)).toBe(44);
    await expectFieldLook(input);
  },
};

export const Small: Story = {
  args: { size: "sm" },
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText("Phone");
    await expect(boxHeight(input)).toBe(36);
    await expectFieldLook(input);
  },
};

export const Desktop: Story = {
  globals: { viewport: { value: "desktop1280", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(
      getComputedStyle(canvas.getByLabelText("Phone")).fontSize,
    ).toBe("16px");
  },
};

export const Invalid: Story = {
  args: { "aria-invalid": true, defaultValue: "12" },
  play: async ({ canvas }) => {
    await expect(
      computedColor(canvas.getByLabelText("Phone"), "borderTopColor"),
    ).toBe(resolvedColor("border-destructive", "borderTopColor"));
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Phone")).toBeDisabled();
  },
};
