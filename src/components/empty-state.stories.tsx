import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CalendarIcon } from "lucide-react";
import { expect } from "storybook/test";
import { accent } from "./accent";
import { Button } from "./ui/button";
import { EmptyState } from "./empty-state";

const meta = {
  title: "App/EmptyState",
  component: EmptyState,
  parameters: { layout: "fullscreen" },
  args: {
    icon: CalendarIcon,
    title: <>No {accent("bookings")} yet</>,
    text: "Upcoming bookings will appear here.",
  },
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { level: 2, name: /No bookings yet/ }),
    ).toBeVisible();
    await expect(canvas.getByText(/Upcoming bookings/)).toBeVisible();
    await expect(
      canvas.getByRole("heading").parentElement?.querySelector("svg"),
    ).toHaveAttribute("aria-hidden", "true");
  },
};

export const WithAction: Story = {
  args: { action: <Button>Add booking</Button> },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading")).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Add booking" }),
    ).toBeVisible();
  },
};
