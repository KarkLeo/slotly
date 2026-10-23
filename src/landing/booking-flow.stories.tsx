import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, waitFor, within } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { isLocale } from "@/i18n/locales";
import { fetchAvailableDays, fetchAvailableSlots } from "./booking-api";
import { BookingFlow } from "./booking-flow";

const dictionaries = { uk, ru, en };

const texts = (locale: unknown) =>
  dictionaries[isLocale(locale) ? locale : "uk"];

const plain = (message: string) => message.replace(/<\/?\w+>/g, "");

// An hour (UTC) on the first date at least `days` ahead that the mock keeps free (not a Sunday).
function futureSlot(days: number, hour: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  if (date.getUTCDay() === 0) date.setUTCDate(date.getUTCDate() + 1);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
}

const meta = {
  title: "Landing/BookingFlow",
  component: BookingFlow,
  args: {
    service: {
      id: "gel",
      name: "Манікюр з покриттям",
      description: "",
      duration: "1 год і 30 хв",
      price: { kind: "fixed", amount: "900 ₴" },
      format: "on_site",
    },
    timeZone: "Europe/Kyiv",
    horizonDays: 30,
  },
} satisfies Meta<typeof BookingFlow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale);
    const next = canvas.getByRole("button", { name: t.Landing.next });
    await expect(next).toBeDisabled();
    await expect(canvas.getByText(t.SlotPicker.pickDate)).toBeVisible();

    await userEvent.click(
      await canvas.findByRole("button", {
        name: new RegExp(t.SlotPicker.nearest),
      }),
    );
    await waitFor(() => expect(next).toBeEnabled());
    const checkedSlots = canvas
      .getAllByRole("radio")
      .filter((radio) => (radio as HTMLInputElement).checked);
    await expect(checkedSlots).toHaveLength(2);

    await userEvent.click(next);
    await expect(
      await canvas.findByRole("heading", {
        level: 1,
        name: plain(t.Landing.contactTitle),
      }),
    ).toHaveFocus();
    await userEvent.click(canvas.getByRole("button", { name: t.Landing.back }));
    await waitFor(() =>
      expect(canvas.queryByRole("heading", { level: 1 })).toBeNull(),
    );
    await waitFor(() => expect(next).toHaveFocus());
  },
};

export const Russian: Story = { ...Default, globals: { locale: "ru" } };

export const English: Story = { ...Default, globals: { locale: "en" } };

export const PickDateAndTime: Story = {
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale);
    const dates = within(
      await canvas.findByRole("group", { name: t.SlotPicker.dates }),
    );
    const free = dates
      .getAllByRole("radio")
      .filter((radio) => !(radio as HTMLInputElement).disabled);
    await userEvent.click(free[1]);
    const times = await canvas.findAllByRole("radio", { name: /:/ });
    await userEvent.click(times[2]);
    await expect(times[2]).toBeChecked();
    await expect(
      canvas.getByRole("button", { name: t.Landing.next }),
    ).toBeEnabled();
  },
};

export const NoFreeTime: Story = {
  beforeEach: () => {
    mocked(fetchAvailableDays).mockResolvedValue([]);
    return () => mocked(fetchAvailableDays).mockReset();
  },
  play: async ({ canvas, globals }) => {
    await expect(
      await canvas.findByRole("heading", {
        name: plain(texts(globals.locale).SlotPicker.noSlotsTitle),
      }),
    ).toBeVisible();
  },
};

export const LoadError: Story = {
  beforeEach: () => {
    mocked(fetchAvailableDays).mockRejectedValueOnce(new Error("offline"));
  },
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale).SlotPicker;
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      t.loadError,
    );
    await userEvent.click(canvas.getByRole("button", { name: t.retry }));
    await expect(
      await canvas.findByRole("group", { name: t.dates }),
    ).toBeVisible();
  },
};

export const SlotsLoadError: Story = {
  beforeEach: () => {
    mocked(fetchAvailableSlots).mockRejectedValue(new Error("offline"));
    return () => mocked(fetchAvailableSlots).mockReset();
  },
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale).SlotPicker;
    const dates = within(await canvas.findByRole("group", { name: t.dates }));
    const free = dates
      .getAllByRole("radio")
      .filter((radio) => !(radio as HTMLInputElement).disabled);
    await userEvent.click(free[0]);
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      t.loadError,
    );
  },
};

export const DatesLoading: Story = {
  beforeEach: () => {
    mocked(fetchAvailableDays).mockReturnValue(new Promise(() => {}));
    return () => mocked(fetchAvailableDays).mockReset();
  },
  play: async ({ canvas, globals }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent(
      texts(globals.locale).SlotPicker.loading,
    );
  },
};

export const SlotsLoading: Story = {
  beforeEach: () => {
    mocked(fetchAvailableSlots)
      .mockResolvedValueOnce([futureSlot(2, 9)])
      .mockReturnValue(new Promise(() => {}));
  },
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale).SlotPicker;
    const dates = within(await canvas.findByRole("group", { name: t.dates }));
    const free = dates
      .getAllByRole("radio")
      .filter((radio) => !(radio as HTMLInputElement).disabled);
    await userEvent.click(free[1]);
    await expect(await canvas.findByRole("status")).toHaveTextContent(
      t.loading,
    );
  },
};

export const NearestTaken: Story = {
  beforeEach: () => {
    const taken = futureSlot(2, 9);
    const left = futureSlot(2, 11);
    mocked(fetchAvailableSlots)
      .mockResolvedValueOnce([taken, left])
      .mockResolvedValue([left]);
  },
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale);
    await userEvent.click(
      await canvas.findByRole("button", {
        name: new RegExp(t.SlotPicker.nearest),
      }),
    );
    await canvas.findAllByRole("radio", { name: /\d:\d\d/ });
    await expect(
      canvas.getByRole("button", { name: t.Landing.next }),
    ).toBeDisabled();
  },
};
