import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, userEvent, waitFor } from "storybook/test";
import { Button } from "./button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "./popover";

function PopoverDemo() {
  return (
    <div className="p-4">
      <Popover>
        <PopoverTrigger render={<Button variant="outline" />}>
          Working hours
        </PopoverTrigger>
        <PopoverContent>
          <PopoverHeader>
            <PopoverTitle>Today</PopoverTitle>
            <PopoverDescription>
              09:00 – 18:00, break 13:00 – 14:00
            </PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>
      <p className="mt-40">Outside</p>
    </div>
  );
}

const meta = {
  title: "UI/Overlays/Popover",
  component: PopoverDemo,
} satisfies Meta<typeof PopoverDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Working hours" }),
    );
    const popover = await screen.findByRole("dialog");
    await waitFor(() => expect(popover).toHaveTextContent("09:00 – 18:00"));
    await userEvent.click(canvas.getByText("Outside"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  },
};

export const EscapeThenOpen: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Working hours" });
    await userEvent.click(trigger);
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await expect(trigger).toHaveFocus();
    // Left open so the a11y check runs on the popup.
    await userEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeVisible());
  },
};
