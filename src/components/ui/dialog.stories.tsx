import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import ru from "../../../messages/ru.json";
import uk from "../../../messages/uk.json";
import { Button } from "./button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { intersects, overflowsX, settle } from "./story-helpers";

type DemoProps = { title: string; description: string; lines?: number };

function DialogDemo({ title, description, lines = 0 }: DemoProps) {
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
          {lines > 0 && (
            // Plain text has nothing to focus, so the body itself takes focus for keyboard scrolling.
            <DialogBody tabIndex={0}>
              {Array.from({ length: lines }, (_, index) => (
                <p key={index}>Line {index + 1} of the booking details.</p>
              ))}
            </DialogBody>
          )}
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
  args: { lines: 60 },
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
    const body = dialog.querySelector<HTMLElement>("[data-slot=dialog-body]")!;
    const heading = within(dialog).getByRole("heading");
    const close = within(dialog).getByRole("button", { name: uk.UI.close });
    const keep = within(dialog).getByRole("button", { name: "Keep" });
    const last = within(dialog).getByText("Line 60 of the booking details.");
    await expect(keep.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      window.innerHeight,
    );
    const headingTop = heading.getBoundingClientRect().top;
    const closeTop = close.getBoundingClientRect().top;
    // Scrolling is ignored until the opening transition has laid the dialog out, so retry it.
    await waitFor(() => {
      settle();
      body.scrollTop = body.scrollHeight;
      expect(body.scrollTop).toBeGreaterThan(0);
      expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        body.getBoundingClientRect().bottom,
      );
    });
    // Only the body scrolls: the header and the close button stay in place.
    await expect(dialog.scrollTop).toBe(0);
    await expect(heading.getBoundingClientRect().top).toBeCloseTo(
      headingTop,
      0,
    );
    await expect(close.getBoundingClientRect().top).toBeCloseTo(closeTop, 0);
    const style = getComputedStyle(heading);
    await expect(
      parseFloat(style.lineHeight) / parseFloat(style.fontSize),
    ).toBeGreaterThanOrEqual(1.2);
  },
};
