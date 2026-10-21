import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import ru from "../../../messages/ru.json";
import uk from "../../../messages/uk.json";
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
import { intersects, overflowsX, settle } from "./story-helpers";

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
      expect(
        within(dialog).getByRole("button", { name: "Keep" }),
      ).toHaveFocus(),
    );
    // Nothing to scroll and buttons inside: the body must not be an extra Tab stop.
    await expect(
      dialog.querySelector("[data-slot=dialog-body]"),
    ).not.toHaveAttribute("tabindex");
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
    const dialog = await screen.findByRole("dialog");
    await expect(overflowsX(dialog)).toBe(false);
    const close = within(dialog).getByRole("button", { name: uk.UI.close });
    const title = within(dialog).getByRole("heading");
    await expect(intersects(title, close)).toBe(false);
  },
};

export const TallContent: Story = {
  args: {
    description: Array.from(
      { length: 40 },
      () => "The client will get an email that the booking is cancelled.",
    ).join(" "),
  },
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Cancel booking" }),
    );
    const dialog = await screen.findByRole("dialog", { name: args.title });
    settle();
    await expect(dialog.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      window.innerHeight,
    );
    await expect(dialog.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
    const keep = within(dialog).getByRole("button", { name: "Keep" });
    const body = dialog.querySelector<HTMLElement>("[data-slot=dialog-body]")!;
    // Scrolling is ignored until the opening transition has laid the dialog out, so retry it.
    await waitFor(() => {
      settle();
      body.scrollTop = body.scrollHeight;
      expect(keep.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        window.innerHeight,
      );
    });
    // The close button stays reachable while the content is scrolled.
    const close = within(dialog).getByRole("button", { name: uk.UI.close });
    await expect(close.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      dialog.getBoundingClientRect().top,
    );
    const title = within(dialog).getByRole("heading");
    const style = getComputedStyle(title);
    await expect(
      parseFloat(style.lineHeight) / parseFloat(style.fontSize),
    ).toBeGreaterThanOrEqual(1.2);
  },
};
