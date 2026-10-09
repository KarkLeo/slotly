import type { Meta, StoryObj } from "@storybook/nextjs-vite";

function Unlabeled() {
  return <input type="text" />;
}

const meta = {
  title: "Temp/A11yViolation",
  component: Unlabeled,
} satisfies Meta<typeof Unlabeled>;

export default meta;

export const Default: StoryObj<typeof meta> = {};
