import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent } from "storybook/test";
import { Checkbox } from "./checkbox";
import { Label } from "./label";
import { boxHeight } from "./story-helpers";

const meta = {
  title: "UI/Inputs/Checkbox",
  component: Checkbox,
  render: (args) => (
    <div className="p-4">
      <Label className="min-h-11 gap-3 text-base">
        <Checkbox {...args} />
        Remind me a day before
      </Label>
    </div>
  ),
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const checkbox = canvas.getByRole("checkbox", {
      name: "Remind me a day before",
    });
    await expect(boxHeight(checkbox)).toBe(20);
    await expect(
      boxHeight(canvas.getByText("Remind me a day before")),
    ).toBeGreaterThanOrEqual(44);
    await userEvent.click(canvas.getByText("Remind me a day before"));
    await expect(checkbox).toHaveAttribute("aria-checked", "true");
  },
};

export const Checked: Story = {
  args: { defaultChecked: true },
};

export const Invalid: Story = {
  args: { "aria-invalid": true },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("checkbox")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  },
};
