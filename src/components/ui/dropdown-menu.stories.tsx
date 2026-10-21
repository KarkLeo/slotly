import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EllipsisIcon } from "lucide-react";
import { expect, fn, screen, userEvent, waitFor } from "storybook/test";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { boxHeight } from "./story-helpers";

function DropdownDemo({ onReschedule }: { onReschedule: () => void }) {
  return (
    <div className="flex justify-end p-4">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" aria-label="Booking actions" />
          }
        >
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onReschedule}>Reschedule</DropdownMenuItem>
          <DropdownMenuItem>Message the client</DropdownMenuItem>
          <DropdownMenuItem>Move to another day</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Cancel</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

const meta = {
  title: "UI/Overlays/DropdownMenu",
  component: DropdownDemo,
  args: { onReschedule: fn() },
} satisfies Meta<typeof DropdownDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, args }) => {
    const trigger = canvas.getByRole("button", { name: "Booking actions" });
    await userEvent.click(trigger);
    const items = await screen.findAllByRole("menuitem");
    for (const item of items) {
      await expect(boxHeight(item)).toBeGreaterThanOrEqual(44);
    }
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
    await userEvent.click(trigger);
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Reschedule" }),
    );
    await expect(args.onReschedule).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  },
};

export const ItemsOnOneLine: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Booking actions" }),
    );
    const item = await screen.findByRole("menuitem", {
      name: "Move to another day",
    });
    await expect(boxHeight(item)).toBe(44);
    await expect(
      screen.getByRole("menu").getBoundingClientRect().right,
    ).toBeLessThanOrEqual(window.innerWidth);
  },
};
