import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AlignCenterIcon, AlignLeftIcon, AlignRightIcon } from "lucide-react";
import { expect, userEvent } from "storybook/test";
import { boxHeight, computedColor } from "./story-helpers";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

const options = [
  { value: "left", label: "Align left", icon: AlignLeftIcon },
  { value: "center", label: "Align center", icon: AlignCenterIcon },
  { value: "right", label: "Align right", icon: AlignRightIcon },
];

const meta = {
  title: "UI/Inputs/ToggleGroup",
  component: ToggleGroup,
  args: { defaultValue: ["left"], "aria-label": "Text alignment" },
  render: (args) => (
    <div className="p-4">
      <ToggleGroup {...args}>
        {options.map(({ value, label, icon: Icon }) => (
          <ToggleGroupItem key={value} value={value} aria-label={label}>
            <Icon />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  ),
} satisfies Meta<typeof ToggleGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const left = canvas.getByRole("button", { name: "Align left" });
    const center = canvas.getByRole("button", { name: "Align center" });
    await expect(boxHeight(left)).toBe(44);
    await expect(left).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(center);
    await expect(center).toHaveAttribute("aria-pressed", "true");
    await expect(left).toHaveAttribute("aria-pressed", "false");
    await expect(computedColor(center)).not.toBe(computedColor(left));
    await userEvent.keyboard("{ArrowRight}");
    await expect(
      canvas.getByRole("button", { name: "Align right" }),
    ).toHaveFocus();
  },
};

export const Outline: Story = {
  args: { variant: "outline", spacing: 0 },
};

export const Disabled: Story = {
  args: { disabled: true },
};
