import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, screen, waitFor, within } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { isLocale, type Locale } from "@/i18n/locales";
import { cancelBooking } from "./actions";
import type { MyBooking } from "./booking";
import { BookingCard } from "./booking-card";
import { stories, view } from "./story-bookings";

const dictionaries = { uk, ru, en };

const localeOf = (value: unknown): Locale => (isLocale(value) ? value : "uk");

const meta = {
  title: "ClientCabinet/BookingCard",
  component: BookingCard,
  parameters: { layout: "fullscreen", booking: stories.confirmed },
  args: { booking: view(stories.confirmed, "uk") },
  render: (_args, { globals, parameters }) => (
    <BookingCard
      booking={view(parameters.booking as MyBooking, localeOf(globals.locale))}
    />
  ),
} satisfies Meta<typeof BookingCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Confirmed: Story = {
  play: async ({ canvas, globals }) => {
    const t = dictionaries[localeOf(globals.locale)].MyBookings;
    await expect(canvas.getByText(t.confirmed)).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: t.masterPage }),
    ).toHaveAttribute("href", "/olena-nails");
    await expect(
      canvas.getByRole("link", { name: t.addToCalendar }),
    ).toHaveAttribute("href", "/app/bookings/b1/calendar");
    await expect(
      canvas.getByRole("link", { name: t.reschedule }),
    ).toHaveAttribute("href", "/app/bookings/b1/reschedule");
    await expect(canvas.getByRole("button", { name: t.cancel })).toBeVisible();
    await expect(canvas.queryByText(t.late)).toBeNull();
  },
};

export const Russian: Story = { ...Confirmed, globals: { locale: "ru" } };

export const English: Story = { ...Confirmed, globals: { locale: "en" } };

export const AwaitingMaster: Story = {
  parameters: { booking: stories.awaitingMaster },
  play: async ({ canvas, globals }) => {
    const t = dictionaries[localeOf(globals.locale)].MyBookings;
    await expect(canvas.getByText(t.awaitingMasterLong)).toBeVisible();
    await expect(
      canvas.getByText(new RegExp(t.waits.split("{date}")[0])),
    ).toBeVisible();
    await expect(canvas.getByText(/Січових Стрільців/)).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: t.reschedule }),
    ).toBeVisible();
  },
};

export const Late: Story = {
  parameters: { booking: stories.late },
  play: async ({ canvas, globals }) => {
    const t = dictionaries[localeOf(globals.locale)].MyBookings;
    await expect(canvas.getByText(t.late)).toBeVisible();
    await expect(canvas.queryByRole("link", { name: t.reschedule })).toBeNull();
    await expect(canvas.queryByRole("button", { name: t.cancel })).toBeNull();
  },
};

export const ArchivedService: Story = {
  parameters: { booking: stories.archivedService },
  play: async ({ canvas, globals }) => {
    const t = dictionaries[localeOf(globals.locale)].MyBookings;
    await expect(canvas.getByText(t.rescheduleClosed)).toBeVisible();
    await expect(canvas.queryByRole("link", { name: t.reschedule })).toBeNull();
    await expect(canvas.getByRole("button", { name: t.cancel })).toBeVisible();
  },
};

export const Completed: Story = {
  parameters: { booking: stories.completed },
  play: async ({ canvas, globals }) => {
    const t = dictionaries[localeOf(globals.locale)].MyBookings;
    await expect(canvas.getByText(t.completed)).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: t.bookAgain }),
    ).toHaveAttribute("href", "/olena-nails?service=gel");
    await expect(
      canvas.queryByRole("link", { name: t.addToCalendar }),
    ).toBeNull();
  },
};

export const Cancelled: Story = {
  parameters: { booking: stories.cancelled },
  play: async ({ canvas, globals }) => {
    const t = dictionaries[localeOf(globals.locale)].MyBookings;
    await expect(canvas.getByText(t.cancelled)).toBeVisible();
    await expect(canvas.queryByRole("link", { name: t.bookAgain })).toBeNull();
    await expect(canvas.queryByRole("button", { name: t.cancel })).toBeNull();
  },
};

export const CancelDialog: Story = {
  play: async ({ canvas, userEvent, globals }) => {
    const t = dictionaries[localeOf(globals.locale)].MyBookings;
    await userEvent.click(canvas.getByRole("button", { name: t.cancel }));
    const dialog = await screen.findByRole("dialog", { name: t.cancelTitle });
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: new RegExp(t.comment) }),
      "Захворіла",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: t.cancelConfirm }),
    );
    await waitFor(() => expect(cancelBooking).toHaveBeenCalled());
    const form = mocked(cancelBooking).mock.calls[0][1];
    await expect(form.get("appointmentId")).toBe("b1");
    await expect(form.get("comment")).toBe("Захворіла");
  },
};
