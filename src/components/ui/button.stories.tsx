import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { Button } from "./button";
import {
  boxHeight,
  computedColor,
  overflowsX,
  resolvedColor,
  settle,
} from "./story-helpers";

const variants = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "link",
  "destructive",
] as const;

const meta = {
  title: "UI/Inputs/Button",
  component: Button,
  args: { children: "Book now" },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-col items-start gap-3 p-4">
      {variants.map((variant) => (
        <Button key={variant} {...args} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    for (const variant of variants) {
      const button = canvas.getByRole("button", { name: variant });
      await expect(boxHeight(button)).toBeGreaterThanOrEqual(44);
    }
    await expect(
      computedColor(canvas.getByRole("button", { name: "destructive" })),
    ).toBe(resolvedColor("bg-destructive-solid"));
  },
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-3 p-4">
      <Button {...args} size="default">
        Default
      </Button>
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="icon" aria-label="Add">
        +
      </Button>
      <Button {...args} size="icon-sm" aria-label="Remove">
        −
      </Button>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(
      boxHeight(canvas.getByRole("button", { name: "Default" })),
    ).toBe(44);
    await expect(boxHeight(canvas.getByRole("button", { name: "Small" }))).toBe(
      36,
    );
    await expect(boxHeight(canvas.getByRole("button", { name: "Add" }))).toBe(
      44,
    );
    await expect(
      boxHeight(canvas.getByRole("button", { name: "Remove" })),
    ).toBe(36);
  },
};

export const OnCard: Story = {
  render: (args) => (
    <div className="m-4 flex gap-3 rounded-2xl bg-card p-4">
      <Button {...args} variant="outline">
        Reschedule
      </Button>
      <Button {...args} variant="ghost">
        Details
      </Button>
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button")).toBeDisabled();
  },
};

export const Loading: Story = {
  args: { loading: true, onClick: fn() },
  play: async ({ canvas, args }) => {
    const button = canvas.getByRole("button", { name: "Book now" });
    button.click();
    await expect(args.onClick).not.toHaveBeenCalled();
    await expect(button).toHaveAttribute("aria-busy", "true");
    await expect(button.querySelector("svg.animate-spin")).not.toBeNull();
  },
};

export const LongText: Story = {
  args: {
    children: "Confirm the booking and send the details to the client by email",
  },
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button");
    await expect(overflowsX(button)).toBe(false);
    await expect(boxHeight(button)).toBeGreaterThanOrEqual(44);
  },
};

export const FocusVisible: Story = {
  play: async ({ canvas }) => {
    await userEvent.tab();
    const button = canvas.getByRole("button");
    await expect(button).toBe(document.activeElement);
    settle();
    await expect(getComputedStyle(button).boxShadow).toContain(
      resolvedColor("bg-ring"),
    );
  },
};

export const FlexRow: Story = {
  render: () => (
    <div className="flex gap-2 p-4" data-testid="row">
      <Button variant="outline">Reschedule the booking</Button>
      <Button>Confirm the booking now</Button>
    </div>
  ),
  play: async ({ canvas }) => {
    const row = canvas.getByTestId("row");
    const right = row.getBoundingClientRect().right;
    for (const button of canvas.getAllByRole("button")) {
      await expect(button.getBoundingClientRect().right).toBeLessThanOrEqual(
        right,
      );
    }
  },
};

function SubmitDemo() {
  const [loading, setLoading] = useState(false);
  return (
    <Button loading={loading} onClick={() => setLoading(true)}>
      Book
    </Button>
  );
}

export const LoadingKeepsFocus: Story = {
  render: () => <SubmitDemo />,
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "Book" });
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(button).toHaveAttribute("aria-busy", "true"));
    await expect(button).toHaveFocus();
  },
};
