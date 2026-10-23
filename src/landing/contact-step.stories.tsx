import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { isLocale } from "@/i18n/locales";
import { ContactStep } from "./contact-step";

const dictionaries = { uk, ru, en };

const texts = (locale: unknown) =>
  dictionaries[isLocale(locale) ? locale : "uk"].Landing;

const meta = {
  title: "Landing/ContactStep",
  component: ContactStep,
  parameters: { layout: "fullscreen" },
  args: {
    summary: {
      service: "Манікюр з покриттям",
      when: "чт, 29 жовтня о 11:45",
      price: { kind: "from", amount: "900 ₴" },
    },
    needsAddress: false,
    onBack: fn(),
    onSubmit: fn(),
  },
} satisfies Meta<typeof ContactStep>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, args, userEvent, globals }) => {
    const t = texts(globals.locale);
    await expect(canvas.getByRole("heading", { level: 1 })).toHaveFocus();

    await userEvent.click(canvas.getByRole("button", { name: t.sendCode }));
    await expect(canvas.getByText(t.nameRequired)).toBeVisible();
    await expect(canvas.getByText(t.emailInvalid)).toBeVisible();
    await expect(args.onSubmit).not.toHaveBeenCalled();

    await userEvent.type(canvas.getByLabelText(t.name), "Ірина");
    await userEvent.type(canvas.getByLabelText(t.email), "iryna@example.com");
    await userEvent.click(canvas.getByRole("button", { name: t.sendCode }));
    await expect(args.onSubmit).toHaveBeenCalledWith({
      name: "Ірина",
      email: "iryna@example.com",
      address: "",
    });

    await userEvent.click(canvas.getByRole("button", { name: t.back }));
    await expect(args.onBack).toHaveBeenCalledTimes(1);
    canvas
      .getByRole("dialog")
      .dispatchEvent(new Event("cancel", { cancelable: true }));
    await expect(args.onBack).toHaveBeenCalledTimes(2);
  },
};

export const Russian: Story = { ...Default, globals: { locale: "ru" } };

export const English: Story = { ...Default, globals: { locale: "en" } };

export const PriceFrom: Story = {
  play: async ({ canvas, globals }) => {
    await expect(
      canvas.getByText(
        texts(globals.locale).priceFrom.replace("{price}", "900 ₴"),
        {
          exact: false,
        },
      ),
    ).toBeVisible();
  },
};

export const AtClient: Story = {
  args: { needsAddress: true },
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale);
    await userEvent.click(canvas.getByRole("button", { name: t.sendCode }));
    await expect(canvas.getByText(t.addressRequired)).toBeVisible();
  },
};

export const NotConnected: Story = {
  args: { onSubmit: undefined },
  play: async ({ canvas, globals }) => {
    await expect(
      canvas.getByRole("button", { name: texts(globals.locale).sendCode }),
    ).toBeDisabled();
  },
};
