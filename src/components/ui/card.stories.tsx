import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Button } from "./button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import { computedColor, resolvedColor } from "./story-helpers";

const meta = {
  title: "UI/Display/Card",
  component: Card,
  render: (args) => (
    <div className="p-4">
      <Card {...args} data-testid="card">
        <CardHeader>
          <CardTitle>Manicure with gel polish</CardTitle>
          <CardDescription>Tomorrow, 14:00 · 90 min</CardDescription>
        </CardHeader>
        <CardContent>Anna Kovalenko · +380 67 000 00 00</CardContent>
      </Card>
    </div>
  ),
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const card = canvas.getByTestId("card");
    const style = getComputedStyle(card);
    await expect(style.boxShadow).toBe("none");
    await expect(style.borderTopWidth).toBe("0px");
    await expect(computedColor(card)).toBe(resolvedColor("bg-card"));
  },
};

export const Inset: Story = {
  args: { variant: "inset" },
  play: async ({ canvas }) => {
    await expect(computedColor(canvas.getByTestId("card"))).toBe(
      resolvedColor("bg-secondary"),
    );
  },
};

export const WithFooter: Story = {
  render: (args) => (
    <div className="p-4">
      <Card {...args}>
        <CardHeader>
          <CardTitle>Pedicure</CardTitle>
          <CardDescription>Friday, 10:30 · 60 min</CardDescription>
        </CardHeader>
        <CardContent>Awaiting confirmation from the client.</CardContent>
        <CardFooter className="gap-2">
          <Button variant="outline">Reschedule</Button>
          <Button>Confirm</Button>
        </CardFooter>
      </Card>
    </div>
  ),
};
