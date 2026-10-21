import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { toast } from "sonner";
import en from "../../../messages/en.json";
import ru from "../../../messages/ru.json";
import uk from "../../../messages/uk.json";
import { expect, fn, screen, userEvent, waitFor } from "storybook/test";
import { Button } from "./button";
import { Toaster } from "./sonner";
import { computedColor, overflowsX, resolvedColor } from "./story-helpers";

const dictionaries = { uk, ru, en };

function texts(locale: unknown) {
  return dictionaries[locale === "ru" || locale === "en" ? locale : "uk"].UI;
}

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
      <Button
        variant="outline"
        onClick={() => toast.warning("The slot is almost full")}
      >
        Warning
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.info("New booking request")}
      >
        Info
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
    for (const [button, text, color] of [
      ["Success", "Booking confirmed", "text-success"],
      ["Error", "Could not save", "text-destructive"],
      ["Warning", "The slot is almost full", "text-warning"],
      ["Info", "New booking request", "text-info"],
      ["Loading", "Saving…", "text-muted-foreground"],
    ]) {
      await userEvent.click(canvas.getByRole("button", { name: button }));
      await screen.findByText(text);
      const icon = toastOf(text).querySelector("svg")!;
      await expect(computedColor(icon, "color")).toBe(
        resolvedColor(color, "color"),
      );
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

const onUndo = fn();

export const WithAction: Story = {
  render: () => (
    <div className="p-4">
      <Toaster />
      <Button
        onClick={() =>
          toast.success("Booking cancelled", {
            action: { label: "Undo", onClick: onUndo },
          })
        }
      >
        Cancel booking
      </Button>
    </div>
  ),
  beforeEach: () => {
    onUndo.mockReset();
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Cancel booking" }),
    );
    const undo = await screen.findByRole("button", { name: "Undo" });
    await waitFor(() => expect(undo).toBeVisible());
    await userEvent.click(undo);
    await expect(onUndo).toHaveBeenCalledOnce();
  },
};

export const WithDescription: Story = {
  render: () => (
    <div className="p-4">
      <Toaster />
      <Button
        onClick={() =>
          toast.success("Booking moved", {
            description: "Friday, 10:30 · Manicure",
          })
        }
      >
        Move booking
      </Button>
    </div>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Move booking" }));
    const description = await screen.findByText("Friday, 10:30 · Manicure");
    await expect(computedColor(description, "color")).toBe(
      resolvedColor("text-muted-foreground", "color"),
    );
  },
};

export const CustomOptions: Story = {
  render: () => (
    <div className="p-4">
      <Toaster closeButton toastOptions={{ duration: 8000 }} />
      <Button
        onClick={() =>
          toast("Booking moved", { description: "Friday, 10:30 · Manicure" })
        }
      >
        Move booking
      </Button>
    </div>
  ),
  play: async ({ canvas, globals }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Move booking" }));
    const description = await screen.findByText("Friday, 10:30 · Manicure");
    await expect(computedColor(description, "color")).toBe(
      resolvedColor("text-muted-foreground", "color"),
    );
    const close = texts(globals.locale).close;
    await expect(
      screen.getByRole("button", { name: close }),
    ).toBeInTheDocument();
  },
};
