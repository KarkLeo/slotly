import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

function ThemeSample() {
  return <p className="bg-background p-4 text-foreground">Slotly</p>;
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
    await expect(getComputedStyle(document.body).backgroundColor).toBe(
      "rgb(255, 255, 255)",
    );
  },
};

export const Dark: Story = {
  globals: { theme: "dark" },
  play: async () => {
    await expect(getComputedStyle(document.body).backgroundColor).toBe(
      "rgb(10, 10, 10)",
    );
  },
};
