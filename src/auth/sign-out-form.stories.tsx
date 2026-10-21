import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { toast } from "sonner";
import { expect, mocked, screen, waitFor } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { Toaster } from "@/components/ui/sonner";
import { signOut } from "./actions";
import { SignOutForm } from "./sign-out-form";

const dictionaries = { uk, ru, en };

function texts(locale: unknown) {
  return dictionaries[locale === "ru" || locale === "en" ? locale : "uk"];
}

const meta = {
  title: "Auth/SignOutForm",
  component: SignOutForm,
  render: () => (
    <div className="p-4">
      <Toaster />
      <SignOutForm />
    </div>
  ),
  beforeEach: () => {
    mocked(signOut).mockReset();
  },
  afterEach: () => {
    toast.dismiss();
  },
} satisfies Meta<typeof SignOutForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SignsOut: Story = {
  play: async ({ canvas, userEvent, globals }) => {
    await userEvent.click(
      canvas.getByRole("button", {
        name: texts(globals.locale).Cabinet.signOut,
      }),
    );
    await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(
      screen.queryByText(texts(globals.locale).Toasts.unexpected),
    ).toBeNull();
  },
};

export const ServerThrows: Story = {
  beforeEach: () => {
    mocked(signOut).mockRejectedValue(new Error("Network error"));
  },
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale);
    const button = canvas.getByRole("button", { name: t.Cabinet.signOut });
    await userEvent.click(button);
    await waitFor(() =>
      expect(screen.getByText(t.Toasts.unexpected)).toBeVisible(),
    );
    await waitFor(() => expect(button).not.toHaveAttribute("aria-busy"));
  },
};
