import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor } from "storybook/test";
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
    // Give the truncation observer time to (wrongly) add a title.
    await new Promise((resolve) => setTimeout(resolve, 100));
    for (const variant of variants) {
      const badge = canvas.getByText(variant).closest("[data-slot=badge]")!;
      // Fits without truncation, so no redundant tooltip.
      await expect(badge).not.toHaveAttribute("title");
      const { height } = badge.getBoundingClientRect();
      await expect(
        parseFloat(getComputedStyle(badge).borderTopLeftRadius),
      ).toBeGreaterThanOrEqual(height / 2);
    }
    const accent = canvas.getByText("accent").closest("[data-slot=badge]")!;
    await expect(computedColor(accent)).toBe(resolvedColor("bg-accent"));
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
    await waitFor(() =>
      expect(label.closest("[data-slot=badge]")).toHaveAttribute(
        "title",
        "Awaiting confirmation from the client",
      ),
    );
    // Once there is room, the title goes away again.
    canvas.getByTestId("wrapper").style.width = "40rem";
    await waitFor(() =>
      expect(label.closest("[data-slot=badge]")).not.toHaveAttribute("title"),
    );
  },
};

const count = 12;
const urgent = false as boolean;

export const CompositeText: Story = {
  render: () => (
    <div className="w-50 p-4">
      <Badge variant="secondary">
        {count} new bookings waiting this week{urgent && "!"}
      </Badge>
    </div>
  ),
  play: async ({ canvas }) => {
    const label = canvas.getByText("12 new bookings waiting this week");
    await expect(getComputedStyle(label).textOverflow).toBe("ellipsis");
    await expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
    await waitFor(() =>
      expect(label.closest("[data-slot=badge]")).toHaveAttribute(
        "title",
        "12 new bookings waiting this week",
      ),
    );
  },
};
