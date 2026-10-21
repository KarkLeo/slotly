import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { toast } from "sonner";
import { expect, mocked, screen, waitFor } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { Toaster } from "@/components/ui/sonner";
import { resolvedColor, settle } from "@/components/ui/story-helpers";
import { signIn } from "./actions";
import { SignInForm } from "./sign-in-form";

const email = "anna@example.com";
const dictionaries = { uk, ru, en };

function texts(locale: unknown) {
  return dictionaries[locale === "ru" || locale === "en" ? locale : "uk"];
}

async function expectToast(text: string) {
  await waitFor(() => expect(screen.getByText(text)).toBeVisible());
}

const meta = {
  title: "Auth/SignInForm",
  component: SignInForm,
  render: (args) => (
    <>
      <Toaster />
      <SignInForm {...args} />
    </>
  ),
  beforeEach: () => {
    mocked(signIn).mockReset();
    mocked(signIn).mockImplementation(async (_state, formData) => ({
      step: "code",
      email: String(formData.get("email")),
      toast: { type: "success", key: "codeSent" },
    }));
  },
  afterEach: () => {
    toast.dismiss();
  },
} satisfies Meta<typeof SignInForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Email: Story = {
  play: async ({ canvas, globals }) => {
    const t = texts(globals.locale).SignIn;
    await expect(canvas.getByRole("heading", { name: t.title })).toBeVisible();
    await expect(canvas.getByLabelText(t.emailLabel)).toBeVisible();
  },
};

export const English: Story = {
  globals: { locale: "en" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: en.SignIn.title }),
    ).toBeVisible();
  },
};

export const InvalidEmail: Story = {
  beforeEach: () => {
    mocked(signIn).mockResolvedValue({
      step: "email",
      email,
      error: "invalidEmail",
    });
  },
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale).SignIn;
    const input = canvas.getByLabelText(t.emailLabel);
    await userEvent.type(input, email);
    await userEvent.click(canvas.getByRole("button", { name: t.sendLink }));
    await expect(await canvas.findByText(t.errors.invalidEmail)).toBeVisible();
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveValue(email);
  },
};

export const RateLimited: Story = {
  beforeEach: () => {
    mocked(signIn).mockResolvedValue({
      step: "email",
      email,
      toast: { type: "error", key: "rateLimited" },
    });
  },
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale);
    await userEvent.type(canvas.getByLabelText(t.SignIn.emailLabel), email);
    await userEvent.click(
      canvas.getByRole("button", { name: t.SignIn.sendLink }),
    );
    await expectToast(t.Toasts.rateLimited);
    await expect(canvas.queryByRole("alert")).toBeNull();
    await expect(canvas.getByLabelText(t.SignIn.emailLabel)).toHaveValue(email);
  },
};

export const CodeSent: Story = {
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale);
    await userEvent.type(canvas.getByLabelText(t.SignIn.emailLabel), email);
    await userEvent.click(
      canvas.getByRole("button", { name: t.SignIn.sendLink }),
    );
    await expect(
      await canvas.findByRole("heading", { name: t.SignIn.codeSentTitle }),
    ).toBeVisible();
    await expect(canvas.getByText(new RegExp(email))).toBeVisible();
    await expect(canvas.getByLabelText(t.SignIn.codeLabel)).toBeVisible();
    await expectToast(t.Toasts.codeSent);
    await expect(signIn).toHaveBeenCalledTimes(1);
    await expect(mocked(signIn).mock.calls[0][1].get("email")).toBe(email);
  },
};

export const InvalidCode: Story = {
  beforeEach: () => {
    mocked(signIn)
      .mockResolvedValueOnce({ step: "code", email })
      .mockResolvedValueOnce({ step: "code", email, error: "invalidCode" });
  },
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale).SignIn;
    await userEvent.type(canvas.getByLabelText(t.emailLabel), email);
    await userEvent.click(canvas.getByRole("button", { name: t.sendLink }));
    const code = await canvas.findByLabelText(t.codeLabel);
    await userEvent.type(code, "123456");
    await userEvent.click(canvas.getByRole("button", { name: t.verify }));
    await expect(await canvas.findByText(t.errors.invalidCode)).toBeVisible();
    await expect(code).toHaveAttribute("aria-invalid", "true");
  },
};

export const Pending: Story = {
  beforeEach: () => {
    let release = () => {};
    mocked(signIn).mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve({ step: "email" });
      }),
    );
    // React 19 entangles pending actions; a never-settling one would block later stories.
    return () => release();
  },
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale).SignIn;
    await userEvent.type(canvas.getByLabelText(t.emailLabel), email);
    const submit = canvas.getByRole("button", { name: t.sendLink });
    await userEvent.click(submit);
    await waitFor(() => expect(submit).toHaveAttribute("aria-busy", "true"));
  },
};

export const KeyboardFocus: Story = {
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale).SignIn;
    await userEvent.click(canvas.getByLabelText(t.emailLabel));
    await userEvent.tab();
    const submit = canvas.getByRole("button", { name: t.sendLink });
    await expect(submit).toHaveFocus();
    settle();
    await expect(getComputedStyle(submit).boxShadow).toContain(
      resolvedColor("bg-ring"),
    );
  },
};

export const RateLimitedOnCode: Story = {
  beforeEach: () => {
    mocked(signIn)
      .mockResolvedValueOnce({ step: "code", email })
      .mockResolvedValueOnce({
        step: "code",
        email,
        toast: { type: "error", key: "rateLimited" },
      });
  },
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale);
    await userEvent.type(canvas.getByLabelText(t.SignIn.emailLabel), email);
    await userEvent.click(
      canvas.getByRole("button", { name: t.SignIn.sendLink }),
    );
    const code = await canvas.findByLabelText(t.SignIn.codeLabel);
    await userEvent.type(code, "123456");
    await userEvent.click(
      canvas.getByRole("button", { name: t.SignIn.verify }),
    );
    await expectToast(t.Toasts.rateLimited);
    await expect(code).not.toHaveAttribute("aria-invalid");
  },
};

export const SameErrorTwice: Story = {
  beforeEach: () => {
    mocked(signIn).mockImplementation(async () => ({
      step: "email",
      email,
      toast: { type: "error", key: "rateLimited" },
    }));
  },
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale);
    await userEvent.type(canvas.getByLabelText(t.SignIn.emailLabel), email);
    const submit = canvas.getByRole("button", { name: t.SignIn.sendLink });
    await userEvent.click(submit);
    await expectToast(t.Toasts.rateLimited);
    await expect(screen.getAllByText(t.Toasts.rateLimited)).toHaveLength(1);
    await waitFor(() => expect(submit).not.toHaveAttribute("aria-busy"));
    await userEvent.click(submit);
    await waitFor(() =>
      expect(screen.getAllByText(t.Toasts.rateLimited)).toHaveLength(2),
    );
  },
};
