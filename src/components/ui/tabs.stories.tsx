import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { boxHeight } from "./story-helpers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const periods = ["Today", "Week", "Month"];

function TabsDemo() {
  return (
    <div className="p-4">
      <Tabs defaultValue="Today">
        <TabsList aria-label="Calendar period">
          {periods.map((period) => (
            <TabsTrigger key={period} value={period}>
              {period}
            </TabsTrigger>
          ))}
        </TabsList>
        {periods.map((period) => (
          <TabsContent key={period} value={period}>
            {period} bookings
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

const meta = {
  title: "UI/Overlays/Tabs",
  component: TabsDemo,
} satisfies Meta<typeof TabsDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(boxHeight(canvas.getByRole("tablist"))).toBe(44);
    await userEvent.click(canvas.getByRole("tab", { name: "Today" }));
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("tab", { name: "Week" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await waitFor(() =>
      expect(canvas.getByRole("tabpanel")).toHaveTextContent("Week bookings"),
    );
  },
};
