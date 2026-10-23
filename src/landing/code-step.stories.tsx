import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { isLocale } from "@/i18n/locales";
import { CodeStep } from "./code-step";

const dictionaries = { uk, ru, en };

const texts = (locale: unknown) =>
  dictionaries[isLocale(locale) ? locale : "uk"].Landing;

const meta = {
  title: "Landing/CodeStep",
  component: CodeStep,
  parameters: { layout: "fullscreen" },
  args: {
    email: "iryna@example.com",
    resendAt: Date.now() + 45_000,
    onSubmit: fn(),
    onResend: fn(),
    onChangeEmail: fn(),
  },
  // The resend countdown starts from when the story renders, not from when the file loads.
  beforeEach: ({ args }) => {
    args.resendAt = Date.now() + 45_000;
  },
} satisfies Meta<typeof CodeStep>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, args, userEvent, globals }) => {
    const t = texts(globals.locale);
    await expect(canvas.getByText("iryna@example.com")).toBeVisible();
    const code = canvas.getByLabelText(t.code);
    await expect(code).toHaveAttribute("autocomplete", "one-time-code");

    await userEvent.type(code, "123");
    await userEvent.click(canvas.getByRole("button", { name: t.confirm }));
    await expect(canvas.getByText(t.codeFormat)).toBeVisible();
    await expect(args.onSubmit).not.toHaveBeenCalled();

    await userEvent.type(code, "456");
    await userEvent.click(canvas.getByRole("button", { name: t.confirm }));
    await expect(args.onSubmit).toHaveBeenCalledWith("123456");

    await expect(canvas.getByRole("button", { name: /0:4\d/ })).toBeDisabled();
    await userEvent.click(canvas.getByRole("button", { name: t.changeEmail }));
    await expect(args.onChangeEmail).toHaveBeenCalled();
    await expect(canvas.getByText(t.holdNote)).toBeVisible();
  },
};

export const Russian: Story = { ...Default, globals: { locale: "ru" } };

export const English: Story = { ...Default, globals: { locale: "en" } };

export const WrongCode: Story = {
  args: { invalid: true },
  play: async ({ canvas, globals }) => {
    const t = texts(globals.locale);
    await expect(canvas.getByText(t.codeInvalid)).toBeVisible();
    await expect(canvas.getByLabelText(t.code)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  },
};

export const ResendReady: Story = {
  beforeEach: ({ args }) => {
    args.resendAt = Date.now() - 1000;
  },
  play: async ({ canvas, args, userEvent, globals }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: texts(globals.locale).resend }),
    );
    await expect(args.onResend).toHaveBeenCalled();
  },
};

export const Confirming: Story = {
  args: { pending: true },
  play: async ({ canvas, globals }) => {
    await expect(
      canvas.getByRole("button", { name: texts(globals.locale).confirm }),
    ).toBeDisabled();
  },
};
