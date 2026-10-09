import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

function ThemeSample() {
  return <p className="bg-background p-4 text-foreground">Slotly</p>;
}

function bodyLuminance() {
  const [r, g, b] = getComputedStyle(document.body)
    .backgroundColor.match(/\d+(\.\d+)?/g)!
    .slice(0, 3)
    .map(Number)
    .map((channel) => {
      const c = channel / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const meta = {
  title: "Foundations/Theme",
  component: ThemeSample,
} satisfies Meta<typeof ThemeSample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Light: Story = {
  globals: { theme: "light" },
  play: async () => {
    await expect(bodyLuminance()).toBeGreaterThan(0.8);
  },
};

export const Dark: Story = {
  globals: { theme: "dark" },
  play: async () => {
    await expect(bodyLuminance()).toBeLessThan(0.05);
  },
};
