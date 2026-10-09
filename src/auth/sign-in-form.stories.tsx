import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, waitFor } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { signIn } from "./actions";
import { SignInForm } from "./sign-in-form";

const email = "anna@example.com";
const dictionaries = { uk, ru, en };

function texts(locale: unknown) {
  return dictionaries[locale === "ru" || locale === "en" ? locale : "uk"]
    .SignIn;
}

const meta = {
  title: "Auth/SignInForm",
  component: SignInForm,
  beforeEach: () => {
    mocked(signIn).mockReset();
  },
} satisfies Meta<typeof SignInForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Email: Story = {
  play: async ({ canvas, globals }) => {
    const t = texts(globals.locale);
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
    await expect(document.documentElement.lang).toBe("en");
  },
};

export const LinkExpired: Story = {
  args: { linkExpired: true },
  play: async ({ canvas, globals }) => {
    const t = texts(globals.locale);
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      t.errors.expiredLink,
    );
  },
};

export const InvalidEmail: Story = {
  beforeEach: () => {
    mocked(signIn).mockResolvedValue({ step: "email", error: "invalidEmail" });
  },
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale);
    await userEvent.type(canvas.getByLabelText(t.emailLabel), email);
    await userEvent.click(canvas.getByRole("button", { name: t.sendLink }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      t.errors.invalidEmail,
    );
  },
};

export const RateLimited: Story = {
  beforeEach: () => {
    mocked(signIn).mockResolvedValue({ step: "email", error: "rateLimited" });
  },
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale);
    await userEvent.type(canvas.getByLabelText(t.emailLabel), email);
    await userEvent.click(canvas.getByRole("button", { name: t.sendLink }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      t.errors.rateLimited,
    );
  },
};

export const CodeSent: Story = {
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale);
    await userEvent.type(canvas.getByLabelText(t.emailLabel), email);
    await userEvent.click(canvas.getByRole("button", { name: t.sendLink }));
    await expect(
      await canvas.findByRole("heading", { name: t.codeSentTitle }),
    ).toBeVisible();
    await expect(canvas.getByText(new RegExp(email))).toBeVisible();
    await expect(canvas.getByLabelText(t.codeLabel)).toBeVisible();
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
    const t = texts(globals.locale);
    await userEvent.type(canvas.getByLabelText(t.emailLabel), email);
    await userEvent.click(canvas.getByRole("button", { name: t.sendLink }));
    await userEvent.type(await canvas.findByLabelText(t.codeLabel), "123456");
    await userEvent.click(canvas.getByRole("button", { name: t.verify }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      t.errors.invalidCode,
    );
  },
};

export const Pending: Story = {
  beforeEach: () => {
    mocked(signIn).mockReturnValue(new Promise(() => {}));
  },
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale);
    await userEvent.type(canvas.getByLabelText(t.emailLabel), email);
    const submit = canvas.getByRole("button", { name: t.sendLink });
    await userEvent.click(submit);
    await waitFor(() => expect(submit).toBeDisabled());
  },
};

export const KeyboardFocus: Story = {
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale);
    await userEvent.click(canvas.getByLabelText(t.emailLabel));
    await userEvent.tab();
    const submit = canvas.getByRole("button", { name: t.sendLink });
    await expect(submit).toHaveFocus();
    const style = getComputedStyle(submit);
    const alpha = Number(style.outlineColor.match(/\/\s*([\d.]+)\)/)?.[1] ?? 1);
    await expect(style.outlineStyle).not.toBe("none");
    await expect(alpha).toBe(1);
  },
};
