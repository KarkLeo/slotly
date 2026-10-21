import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LinkIcon } from "lucide-react";
import { expect, userEvent, waitFor } from "storybook/test";
import { Button } from "./button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

function TooltipDemo() {
  return (
    <div className="p-16">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              aria-label="Copy booking link"
            />
          }
        >
          <LinkIcon />
        </TooltipTrigger>
        <TooltipContent>Copy booking link</TooltipContent>
      </Tooltip>
    </div>
  );
}

const meta = {
  title: "UI/Overlays/Tooltip",
  component: TooltipDemo,
} satisfies Meta<typeof TooltipDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Copy booking link" });
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    // Base UI tooltips are visual-only (no tooltip role); the trigger's aria-label carries the name.
    await waitFor(() =>
      expect(
        document.querySelector('[data-slot="tooltip-content"]'),
      ).toHaveTextContent("Copy booking link"),
    );
  },
};
