import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, mocked, screen, waitFor, within } from "storybook/test";
import en from "../../../messages/en.json";
import ru from "../../../messages/ru.json";
import uk from "../../../messages/uk.json";
import { overflowsX } from "@/components/ui/story-helpers";
import { isLocale, type Locale } from "@/i18n/locales";
import { CancelAppointmentDialog } from "./cancel-appointment-dialog";

const dictionaries = { uk, ru, en };

const textsOf = (locale: unknown) =>
  dictionaries[isLocale(locale) ? (locale as Locale) : "uk"].MasterCabinet.today
    .decline;

const meta = {
  title: "MasterCabinet/CancelAppointmentDialog",
  component: CancelAppointmentDialog,
  globals: { viewport: { value: "mobile360" } },
  args: {
    appointmentId: "a5",
    action: fn<(formData: FormData) => void>(),
    pending: false,
  },
} satisfies Meta<typeof CancelAppointmentDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Decline: Story = {
  play: async ({ args, canvas, userEvent, globals }) => {
    const t = textsOf(globals.locale);
    await userEvent.click(canvas.getByRole("button", { name: t.open }));
    const dialog = await screen.findByRole("dialog", { name: t.title });
    await expect(dialog).toHaveTextContent(t.text);
    await expect(
      within(dialog).getByRole("textbox", { name: new RegExp(t.comment) }),
    ).toHaveAttribute("placeholder", t.placeholder);
    await expect(overflowsX(document.documentElement)).toBe(false);
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: new RegExp(t.comment) }),
      "Захворіла",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: t.submit }),
    );
    await waitFor(() => expect(args.action).toHaveBeenCalledTimes(1));
    const form = mocked(args.action).mock.calls[0][0];
    await expect(form.get("appointmentId")).toBe("a5");
    await expect(form.get("comment")).toBe("Захворіла");
  },
};

export const DeclineRussian: Story = { ...Decline, globals: { locale: "ru" } };

export const DeclineEnglish: Story = { ...Decline, globals: { locale: "en" } };

export const Back: Story = {
  play: async ({ args, canvas, userEvent, globals }) => {
    const t = textsOf(globals.locale);
    await userEvent.click(canvas.getByRole("button", { name: t.open }));
    const dialog = await screen.findByRole("dialog", { name: t.title });
    await userEvent.click(within(dialog).getByRole("button", { name: t.back }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await expect(args.action).not.toHaveBeenCalled();
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas, globals }) => {
    const t = textsOf(globals.locale);
    await expect(canvas.getByRole("button", { name: t.open })).toBeDisabled();
  },
};
