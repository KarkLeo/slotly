import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Skeleton } from "./skeleton";
import { computedColor, resolvedColor } from "./story-helpers";

const meta = {
  title: "UI/Display/Skeleton",
  component: Skeleton,
} satisfies Meta<typeof Skeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-3 p-4">
      <Skeleton className="size-10 rounded-full" data-testid="avatar" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(computedColor(canvas.getByTestId("avatar"))).toBe(
      resolvedColor("bg-muted"),
    );
  },
};
