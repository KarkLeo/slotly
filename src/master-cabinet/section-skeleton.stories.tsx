import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { overflowsX } from "@/components/ui/story-helpers";
import { SectionSkeleton } from "./section-skeleton";

const meta = {
  title: "MasterCabinet/SectionSkeleton",
  component: SectionSkeleton,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "mobile360" } },
} satisfies Meta<typeof SectionSkeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector("[aria-busy='true']");
    await expect(root).not.toBeNull();
    await expect(
      canvasElement.querySelectorAll("[data-slot='skeleton']"),
    ).toHaveLength(4);
    await expect(overflowsX(canvasElement)).toBe(false);
  },
};
