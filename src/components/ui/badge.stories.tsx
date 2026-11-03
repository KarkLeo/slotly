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
  "muted",
  "success",
  "warning",
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
      const badge = canvas.getByText(variant).closest("[data-slot=badge]")!;
      const { height } = badge.getBoundingClientRect();
      await expect(
        parseFloat(getComputedStyle(badge).borderTopLeftRadius),
      ).toBeGreaterThanOrEqual(height / 2);
    }
    const accent = canvas.getByText("accent").closest("[data-slot=badge]")!;
    await expect(computedColor(accent)).toBe(resolvedColor("bg-accent"));
  },
};

// Status badges sit on cards as well as on the page, so their text must keep its contrast on both.
export const StatusOnCard: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 bg-card p-4">
      {variants.map((variant) => (
        <Badge key={variant} variant={variant} size="status">
          {variant}
        </Badge>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    // A one-line status badge stays 20 px tall, with or without a visible border.
    for (const variant of variants) {
      const status = canvas.getByText(variant).closest("[data-slot=badge]")!;
      await expect(getComputedStyle(status).fontWeight).toBe("600");
      await expect(status.getBoundingClientRect().height).toBe(20);
    }
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
    const label = canvas.getByText("Awaiting confirmation from the client");
    await expect(getComputedStyle(label).textOverflow).toBe("ellipsis");
    await expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
  },
};
