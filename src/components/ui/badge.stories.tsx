import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Badge } from "./badge";
import { computedColor, overflowsX, resolvedColor } from "./story-helpers";

const variants = [
  "default",
  "secondary",
  "accent",
  "outline",
  "destructive",
] as const;

const meta = {
  title: "UI/Display/Badge",
  component: Badge,
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 p-4">
      {variants.map((variant) => (
        <Badge key={variant} variant={variant}>
          {variant}
        </Badge>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    for (const variant of variants) {
      const badge = canvas.getByText(variant);
      const { height } = badge.getBoundingClientRect();
      await expect(
        parseFloat(getComputedStyle(badge).borderTopLeftRadius),
      ).toBeGreaterThanOrEqual(height / 2);
    }
    await expect(computedColor(canvas.getByText("accent"))).toBe(
      resolvedColor("bg-accent"),
    );
  },
};

export const LongText: Story = {
  render: () => (
    <div className="w-50 p-4" data-testid="wrapper">
      <Badge variant="accent">Awaiting confirmation from the client</Badge>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(overflowsX(canvas.getByTestId("wrapper"))).toBe(false);
  },
};
