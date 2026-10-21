import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent } from "storybook/test";
import { Label } from "./label";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { boxHeight } from "./story-helpers";

const options = ["Email", "Telegram", "Phone call"];

const meta = {
  title: "UI/Inputs/RadioGroup",
  component: RadioGroup,
  args: { defaultValue: "Email", "aria-label": "Contact method" },
  render: (args) => (
    <div className="p-4">
      <RadioGroup {...args}>
        {options.map((option) => (
          <Label key={option} className="min-h-11 gap-3 text-base">
            <RadioGroupItem value={option} />
            {option}
          </Label>
        ))}
      </RadioGroup>
    </div>
  ),
} satisfies Meta<typeof RadioGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const email = canvas.getByRole("radio", { name: "Email" });
    await expect(boxHeight(email)).toBe(20);
    await userEvent.click(email);
    await userEvent.keyboard("{ArrowDown}");
    await expect(
      canvas.getByRole("radio", { name: "Telegram" }),
    ).toHaveAttribute("aria-checked", "true");
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};
