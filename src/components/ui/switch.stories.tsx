import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent } from "storybook/test";
import { Label } from "./label";
import { computedColor, resolvedColor } from "./story-helpers";
import { Switch } from "./switch";

const meta = {
  title: "UI/Inputs/Switch",
  component: Switch,
  render: (args) => (
    <div className="p-4">
      <Label className="min-h-11 justify-between gap-3 text-base">
        Accept online bookings
        <Switch {...args} />
      </Label>
    </div>
  ),
} satisfies Meta<typeof Switch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const control = canvas.getByRole("switch", {
      name: "Accept online bookings",
    });
    const { height, width } = control.getBoundingClientRect();
    await expect([height, width]).toEqual([24, 44]);
    await expect(computedColor(control)).toBe(resolvedColor("bg-input"));
    await userEvent.click(control);
    await expect(control).toHaveAttribute("aria-checked", "true");
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};
