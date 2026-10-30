import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, mocked, screen, waitFor, within } from "storybook/test";
import { CommentDialog } from "./comment-dialog";
import { Button } from "./ui/button";
import { overflowsX } from "./ui/story-helpers";

const meta = {
  title: "App/CommentDialog",
  component: CommentDialog,
  globals: { viewport: { value: "mobile360" } },
  args: {
    trigger: <Button variant="outline">Decline</Button>,
    title: "Decline the booking?",
    text: "The client will be told the booking was declined.",
    commentLabel: "Comment for the client",
    optionalLabel: "(optional)",
    placeholder: "For example: I'm ill",
    submitLabel: "Decline booking",
    backLabel: "Back",
    action: fn<(formData: FormData) => void>(),
    pending: false,
    children: <input type="hidden" name="appointmentId" value="a5" />,
  },
} satisfies Meta<typeof CommentDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Submit: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Decline" }));
    const dialog = await screen.findByRole("dialog", { name: args.title });
    await expect(dialog).toHaveAccessibleDescription(args.text);
    const comment = within(dialog).getByRole("textbox", {
      name: "Comment for the client (optional)",
    });
    await expect(comment).toHaveAttribute("placeholder", args.placeholder);
    await expect(comment).toHaveAttribute("maxlength", "500");
    await expect(overflowsX(document.documentElement)).toBe(false);
    await userEvent.type(comment, "Захворіла");
    await userEvent.click(
      within(dialog).getByRole("button", { name: args.submitLabel }),
    );
    await waitFor(() => expect(args.action).toHaveBeenCalledTimes(1));
    const form = mocked(args.action).mock.calls[0][0];
    await expect(form.get("appointmentId")).toBe("a5");
    await expect(form.get("comment")).toBe("Захворіла");
  },
};

export const Back: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Decline" }));
    const dialog = await screen.findByRole("dialog", { name: args.title });
    await userEvent.click(
      within(dialog).getByRole("button", { name: args.backLabel }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await expect(args.action).not.toHaveBeenCalled();
  },
};

export const Pending: Story = {
  args: { pending: true },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Decline" }));
    const dialog = await screen.findByRole("dialog", { name: args.title });
    const submit = within(dialog).getByRole("button", {
      name: args.submitLabel,
    });
    await expect(submit).toHaveAttribute("aria-busy", "true");
    await expect(submit).toHaveAttribute("aria-disabled", "true");
    await expect(
      within(dialog).getByRole("button", { name: args.backLabel }),
    ).toBeDisabled();
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Decline" }),
    ).toBeDisabled();
  },
};
