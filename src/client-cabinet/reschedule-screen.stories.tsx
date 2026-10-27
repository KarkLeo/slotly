import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { isLocale, type Locale } from "@/i18n/locales";
import { rescheduleBooking } from "./actions";
import type { MyBooking } from "./booking";
import { fetchRescheduleSlots } from "./reschedule-api";
import { RescheduleScreen } from "./reschedule-screen";
import { stories, view } from "./story-bookings";

const dictionaries = { uk, ru, en };

const localeOf = (value: unknown): Locale => (isLocale(value) ? value : "uk");

const meta = {
  title: "ClientCabinet/RescheduleScreen",
  component: RescheduleScreen,
  parameters: { layout: "fullscreen", booking: stories.confirmed },
  args: { booking: view(stories.confirmed, "uk") },
  render: (_args, { globals, parameters }) => (
    <RescheduleScreen
      booking={view(parameters.booking as MyBooking, localeOf(globals.locale))}
    />
  ),
} satisfies Meta<typeof RescheduleScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent, globals }) => {
    const t = dictionaries[localeOf(globals.locale)];
    const submit = canvas.getByRole("button", {
      name: t.MyBookings.reschedule,
    });
    await expect(submit).toBeDisabled();
    await expect(canvas.getByText(t.MyBookings.pickTime)).toBeVisible();
    await expect(canvas.queryByText(t.MyBookings.needsApproval)).toBeNull();

    await userEvent.click(
      await canvas.findByRole("button", {
        name: new RegExp(t.SlotPicker.nearest),
      }),
    );
    await waitFor(() => expect(submit).toBeEnabled());
    await expect(fetchRescheduleSlots).toHaveBeenCalledWith(
      "gel",
      "b1",
      expect.any(String),
    );
    await userEvent.click(submit);
    await waitFor(() =>
      expect(rescheduleBooking).toHaveBeenCalledWith({
        appointmentId: "b1",
        startsAt: expect.any(String),
      }),
    );
    await expect(
      await canvas.findByText(
        new RegExp(t.SlotPicker.slotTaken.split("{time}")[0]),
      ),
    ).toBeVisible();
  },
};

export const Russian: Story = { ...Default, globals: { locale: "ru" } };

export const English: Story = { ...Default, globals: { locale: "en" } };

export const NeedsApproval: Story = {
  parameters: { booking: stories.awaitingMaster },
  play: async ({ canvas, globals }) => {
    const t = dictionaries[localeOf(globals.locale)].MyBookings;
    await expect(canvas.getByText(t.needsApproval)).toBeVisible();
    await expect(canvas.getByText(/Дарина Коваль/)).toBeVisible();
  },
};
