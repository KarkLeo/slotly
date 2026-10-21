import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { toast } from "sonner";
import ru from "../../../messages/ru.json";
import { expect, screen, userEvent, waitFor } from "storybook/test";
import { Button } from "./button";
import { Toaster } from "./sonner";
import { computedColor, overflowsX, resolvedColor } from "./story-helpers";

function toastOf(text: string) {
  return screen.getByText(text).closest("[data-sonner-toast]") as HTMLElement;
}

function ToastDemo({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-start gap-3 p-4">
      <Toaster />
      <Button onClick={() => toast(message)}>Show</Button>
      <Button
        variant="outline"
        onClick={() => toast.success("Booking confirmed")}
      >
        Success
      </Button>
      <Button variant="outline" onClick={() => toast.error("Could not save")}>
        Error
      </Button>
      <Button variant="outline" onClick={() => toast.loading("Saving…")}>
        Loading
      </Button>
    </div>
  );
}

const meta = {
  title: "UI/Feedback/Toast",
  component: ToastDemo,
  args: { message: "Booking moved to Friday, 10:30" },
  afterEach: () => {
    toast.dismiss();
  },
} satisfies Meta<typeof ToastDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Show" }));
    await screen.findByText(args.message);
    await waitFor(() =>
      expect(computedColor(toastOf(args.message))).toBe(
        resolvedColor("bg-popover"),
      ),
    );
  },
};

export const Variants: Story = {
  play: async ({ canvas }) => {
    for (const [button, text] of [
      ["Success", "Booking confirmed"],
      ["Error", "Could not save"],
      ["Loading", "Saving…"],
    ]) {
      await userEvent.click(canvas.getByRole("button", { name: button }));
      await screen.findByText(text);
      await expect(toastOf(text).querySelector("svg")).not.toBeNull();
    }
  },
};

export const LongText: Story = {
  args: {
    message:
      "The client moved the booking for a classic manicure with gel polish to Friday, 10:30, and asked for a reminder the day before",
  },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Show" }));
    await screen.findByText(args.message);
    await expect(overflowsX(toastOf(args.message))).toBe(false);
  },
};

export const RegionLabelRu: Story = {
  globals: { locale: "ru" },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Show" }));
    await screen.findByText(args.message);
    await expect(
      screen.getByRole("region", { name: new RegExp(ru.UI.notifications) }),
    ).toBeInTheDocument();
  },
};
