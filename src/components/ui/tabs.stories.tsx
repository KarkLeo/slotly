import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { boxHeight, settle } from "./story-helpers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const periods = ["Today", "Week", "Month"];

function TabsDemo({
  labels = periods,
  variant,
  orientation,
}: {
  labels?: string[];
  variant?: "default" | "line";
  orientation?: "horizontal" | "vertical";
}) {
  return (
    <div className="p-4">
      <Tabs defaultValue={labels[0]} orientation={orientation}>
        <TabsList aria-label="Calendar period" variant={variant}>
          {labels.map((period) => (
            <TabsTrigger key={period} value={period}>
              {period}
            </TabsTrigger>
          ))}
        </TabsList>
        {labels.map((period) => (
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

export const LongLabels: Story = {
  args: {
    labels: ["Today's bookings", "This week's bookings", "Whole month"],
  },
  globals: { viewport: { value: "mobile360", isRotated: false } },
  play: async ({ canvas }) => {
    const list = canvas.getByRole("tablist");
    await expect(list.scrollWidth).toBeGreaterThan(list.clientWidth);
    await expect(boxHeight(list)).toBe(44);
    const first = canvas.getAllByRole("tab")[0];
    await expect(first.getBoundingClientRect().left).toBeGreaterThanOrEqual(
      list.getBoundingClientRect().left,
    );
    await expect(list.getBoundingClientRect().right).toBeLessThanOrEqual(
      window.innerWidth,
    );
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      window.innerWidth,
    );
  },
};

// The underline is drawn with ::after outside the trigger; it must stay inside the list's clipping box.
function underlineBox(trigger: Element) {
  settle();
  const rect = trigger.getBoundingClientRect();
  const style = getComputedStyle(trigger, "::after");
  return {
    bottom: rect.bottom - parseFloat(style.bottom),
    right: rect.right - parseFloat(style.right),
  };
}

export const Line: Story = {
  args: { variant: "line" },
  play: async ({ canvas }) => {
    const list = canvas.getByRole("tablist");
    const active = canvas.getByRole("tab", { name: "Today" });
    await expect(underlineBox(active).bottom).toBeLessThanOrEqual(
      list.getBoundingClientRect().bottom,
    );
    const inactive = canvas.getByRole("tab", { name: "Week" });
    await expect(getComputedStyle(active, "::after").opacity).toBe("1");
    await expect(getComputedStyle(inactive, "::after").opacity).toBe("0");
  },
};

export const Vertical: Story = {
  args: { variant: "line", orientation: "vertical" },
  play: async ({ canvas }) => {
    const list = canvas.getByRole("tablist");
    await expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth);
    const active = canvas.getByRole("tab", { name: "Today" });
    await expect(underlineBox(active).right).toBeLessThanOrEqual(
      list.getBoundingClientRect().right,
    );
    await userEvent.click(active);
    await userEvent.keyboard("{ArrowDown}");
    await expect(canvas.getByRole("tab", { name: "Week" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  },
};
