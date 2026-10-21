import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import ru from "../../../messages/ru.json";
import { Button } from "./button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { overflowsX } from "./story-helpers";

type DemoProps = { title: string; description: string };

function DialogDemo({ title, description }: DemoProps) {
  return (
    <div className="p-4">
      <Dialog>
        <DialogTrigger render={<Button variant="outline" />}>
          Cancel booking
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Keep
            </DialogClose>
            <Button variant="destructive">Cancel booking</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const meta = {
  title: "UI/Overlays/Dialog",
  component: DialogDemo,
  args: {
    title: "Cancel booking?",
    description: "The client will get an email that the booking is cancelled.",
  },
} satisfies Meta<typeof DialogDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, args }) => {
    const trigger = canvas.getByRole("button", { name: "Cancel booking" });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: args.title });
    await waitFor(() =>
      expect(dialog).toContainElement(document.activeElement as HTMLElement),
    );
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const CloseLabelRu: Story = {
  globals: { locale: "ru" },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Cancel booking" }),
    );
    const dialog = await screen.findByRole("dialog");
    await waitFor(() =>
      expect(
        within(dialog).getByRole("button", { name: ru.UI.close }),
      ).toBeVisible(),
    );
  },
};

export const LongText: Story = {
  args: {
    title:
      "Cancel the booking for a classic manicure with gel polish and nail strengthening?",
    description:
      "The client will get an email that the booking is cancelled, and the slot becomes free for other clients right away.",
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Cancel booking" }),
    );
    await expect(overflowsX(await screen.findByRole("dialog"))).toBe(false);
  },
};
