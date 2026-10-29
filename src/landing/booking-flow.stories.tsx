import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, waitFor, within } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { useBrowserTimeZone } from "@/booking/browser-time-zone";
import { slotTimeLabel, zoneLabel } from "@/booking/dates";
import { isLocale } from "@/i18n/locales";
import { confirmBooking, startBooking } from "./booking-actions";
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
    cancelDeadlineMinutes: 720,
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

type Play = NonNullable<Story["play"]>;
type Context = Parameters<Play>[0];

async function openBooking({ canvas, userEvent, globals }: Context) {
  const t = texts(globals.locale);
  await userEvent.click(
    await canvas.findByRole("button", {
      name: new RegExp(t.SlotPicker.nearest),
    }),
  );
  const next = canvas.getByRole("button", { name: t.Landing.next });
  await waitFor(() => expect(next).toBeEnabled());
  await userEvent.click(next);
  await canvas.findByRole("heading", {
    level: 1,
    name: plain(t.Landing.contactTitle),
  });
}

async function sendContact({ canvas, userEvent, globals }: Context) {
  const t = texts(globals.locale).Landing;
  await userEvent.type(canvas.getByLabelText(t.name), "Ірина");
  await userEvent.type(canvas.getByLabelText(t.email), "iryna@example.com");
  await userEvent.click(canvas.getByRole("button", { name: t.sendCode }));
}

async function enterCode({ canvas, userEvent, globals }: Context) {
  const t = texts(globals.locale).Landing;
  await userEvent.type(await canvas.findByLabelText(t.code), "123456");
  await userEvent.click(canvas.getByRole("button", { name: t.confirm }));
}

export const BookAndConfirm: Story = {
  play: async (context) => {
    const { canvas, userEvent, globals } = context;
    const t = texts(globals.locale);
    await openBooking(context);
    await sendContact(context);
    await expect(
      await canvas.findByRole("heading", {
        level: 1,
        name: plain(t.Landing.codeTitle),
      }),
    ).toHaveFocus();
    await expect(startBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceId: "gel",
        name: "Ірина",
        email: "iryna@example.com",
        address: "",
        locale: isLocale(globals.locale) ? globals.locale : "uk",
        replaces: null,
      }),
    );
    const sent = await canvas.findByText(t.Toasts.codeSent);
    await waitFor(() => expect(sent).toBeVisible());

    await enterCode(context);
    await expect(
      await canvas.findByRole("heading", {
        level: 1,
        name: plain(t.Landing.doneTitle),
      }),
    ).toHaveFocus();
    await expect(confirmBooking).toHaveBeenCalledWith({
      appointmentId: "appointment-1",
      email: "iryna@example.com",
      code: "123456",
    });

    await userEvent.click(
      canvas.getByRole("button", { name: t.Landing.close }),
    );
    await waitFor(() =>
      expect(canvas.queryByRole("heading", { level: 1 })).toBeNull(),
    );
  },
};

export const BookAndConfirmEnglish: Story = {
  ...BookAndConfirm,
  globals: { locale: "en" },
};

export const AwaitingMaster: Story = {
  beforeEach: () => {
    mocked(confirmBooking).mockResolvedValueOnce({
      status: "awaitingMaster",
      toast: { type: "success", key: "bookingRequested" },
    });
  },
  play: async (context) => {
    const t = texts(context.globals.locale).Landing;
    await openBooking(context);
    await sendContact(context);
    await enterCode(context);
    await expect(
      await context.canvas.findByText(t.awaitingMaster),
    ).toBeVisible();
  },
};

export const WrongCode: Story = {
  beforeEach: () => {
    mocked(confirmBooking).mockResolvedValueOnce({ status: "invalidCode" });
  },
  play: async (context) => {
    const t = texts(context.globals.locale).Landing;
    await openBooking(context);
    await sendContact(context);
    await enterCode(context);
    await expect(await context.canvas.findByText(t.codeInvalid)).toBeVisible();
  },
};

export const ChangeEmail: Story = {
  play: async (context) => {
    const { canvas, userEvent, globals } = context;
    const t = texts(globals.locale).Landing;
    await openBooking(context);
    await sendContact(context);
    await userEvent.click(
      await canvas.findByRole("button", { name: t.changeEmail }),
    );
    const email = await canvas.findByLabelText(t.email);
    await expect(email).toHaveValue("iryna@example.com");
    await userEvent.clear(email);
    await userEvent.type(email, "iryna.k@example.com");
    await userEvent.click(canvas.getByRole("button", { name: t.sendCode }));
    await waitFor(() =>
      expect(startBooking).toHaveBeenLastCalledWith(
        expect.objectContaining({
          email: "iryna.k@example.com",
          replaces: "appointment-1",
          reuseCode: false,
        }),
      ),
    );
  },
};

export const LimitReached: Story = {
  beforeEach: () => {
    mocked(startBooking).mockResolvedValueOnce({ status: "limitReached" });
  },
  play: async (context) => {
    await openBooking(context);
    await sendContact(context);
    await expect(await context.canvas.findByRole("alert")).toHaveTextContent(
      texts(context.globals.locale).Landing.limitReached,
    );
  },
};

export const Expired: Story = {
  beforeEach: () => {
    mocked(confirmBooking).mockResolvedValueOnce({ status: "expired" });
  },
  play: async (context) => {
    const { canvas, userEvent, globals } = context;
    const t = texts(globals.locale).Landing;
    await openBooking(context);
    await sendContact(context);
    await enterCode(context);
    await userEvent.click(
      await canvas.findByRole("button", { name: t.chooseAgain }),
    );
    await waitFor(() =>
      expect(canvas.queryByRole("heading", { level: 1 })).toBeNull(),
    );
  },
};

export const FailedThenRetry: Story = {
  beforeEach: () => {
    mocked(startBooking).mockRejectedValueOnce(new Error("offline"));
  },
  play: async (context) => {
    const { canvas, userEvent, globals } = context;
    const t = texts(globals.locale).Landing;
    await openBooking(context);
    await sendContact(context);
    await userEvent.click(
      await canvas.findByRole("button", { name: t.tryAgain }),
    );
    await expect(
      await canvas.findByRole("heading", {
        level: 1,
        name: plain(t.codeTitle),
      }),
    ).toBeVisible();
    await expect(startBooking).toHaveBeenCalledTimes(2);
  },
};

export const SlotTaken: Story = {
  beforeEach: () => {
    const taken = futureSlot(2, 7);
    const left = futureSlot(2, 9);
    mocked(fetchAvailableSlots)
      .mockResolvedValueOnce([taken, left])
      .mockResolvedValueOnce([taken, left])
      .mockResolvedValue([left]);
    mocked(startBooking).mockResolvedValueOnce({ status: "slotTaken" });
  },
  play: async (context) => {
    const { canvas, globals } = context;
    const t = texts(globals.locale);
    await openBooking(context);
    await sendContact(context);
    await waitFor(() =>
      expect(canvas.queryByRole("heading", { level: 1 })).toBeNull(),
    );
    const locale = isLocale(globals.locale) ? globals.locale : "uk";
    const time = (slot: string) => slotTimeLabel(slot, "Europe/Kyiv", locale);
    const banner = await canvas.findByRole("alert");
    await expect(banner).toHaveTextContent(time(futureSlot(2, 7)));
    await expect(banner).toHaveTextContent(time(futureSlot(2, 9)));
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: new RegExp(t.SlotPicker.nearest) }),
      ).toHaveTextContent(time(futureSlot(2, 9))),
    );
    await expect(
      canvas.getByRole("button", { name: t.Landing.next }),
    ).toBeDisabled();
  },
};

export const BrowserClosesDialog: Story = {
  play: async (context) => {
    const { canvas, globals } = context;
    const t = texts(globals.locale).Landing;
    await openBooking(context);
    await sendContact(context);
    await canvas.findByRole("heading", { level: 1, name: plain(t.codeTitle) });
    const dialog = canvas.getByRole("dialog") as HTMLDialogElement;
    dialog.close();
    await expect(
      await canvas.findByRole("heading", {
        level: 1,
        name: plain(t.contactTitle),
      }),
    ).toBeVisible();
    await expect(dialog.open).toBe(true);
  },
};

export const SameEmailAgain: Story = {
  play: async (context) => {
    const { canvas, userEvent, globals } = context;
    const t = texts(globals.locale).Landing;
    await openBooking(context);
    await sendContact(context);
    await userEvent.click(
      await canvas.findByRole("button", { name: t.changeEmail }),
    );
    await userEvent.click(
      await canvas.findByRole("button", { name: t.sendCode }),
    );
    await waitFor(() =>
      expect(startBooking).toHaveBeenLastCalledWith(
        expect.objectContaining({
          replaces: "appointment-1",
          reuseCode: true,
        }),
      ),
    );
    await expect(
      await canvas.findByRole("heading", {
        level: 1,
        name: plain(t.codeTitle),
      }),
    ).toBeVisible();
  },
};

export const StaleCloseEvent: Story = {
  play: async (context) => {
    const { canvas, globals } = context;
    const t = texts(globals.locale).Landing;
    await openBooking(context);
    await sendContact(context);
    await canvas.findByRole("heading", { level: 1, name: plain(t.codeTitle) });
    // A close queued before the dialog was shown again, as React's dev double mount does.
    const dialog = canvas.getByRole("dialog") as HTMLDialogElement;
    dialog.close();
    dialog.showModal();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(
      canvas.getByRole("heading", { level: 1, name: plain(t.codeTitle) }),
    ).toBeVisible();
  },
};

const newYork = "America/New_York";

const onlineService = {
  ...meta.args.service,
  name: "Онлайн-консультація",
  format: "online" as const,
};

function slotRadio(canvas: Context["canvas"], slot: string) {
  return canvas
    .getAllByRole("radio")
    .find((radio) => (radio as HTMLInputElement).value === slot);
}

export const OnlineInClientZone: Story = {
  args: { service: onlineService },
  beforeEach: () => {
    mocked(useBrowserTimeZone).mockReturnValue(newYork);
  },
  play: async (context) => {
    const { canvas, userEvent, globals } = context;
    const t = texts(globals.locale);
    const locale = isLocale(globals.locale) ? globals.locale : "uk";
    const zones = within(
      await canvas.findByRole("group", { name: t.SlotPicker.zones }),
    );
    const own = zones.getByRole("radio", {
      name: new RegExp(t.SlotPicker.clientZone),
    });
    await expect(own).toBeChecked();
    await expect(canvas.getAllByText(zoneLabel(newYork, locale))).toHaveLength(
      2,
    );

    await userEvent.click(
      await canvas.findByRole("button", {
        name: new RegExp(t.SlotPicker.nearest),
      }),
    );
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: t.Landing.next }),
      ).toBeEnabled(),
    );
    await expect(fetchAvailableSlots).toHaveBeenLastCalledWith(
      "gel",
      expect.any(String),
      newYork,
    );
    const slot = (
      canvas
        .getAllByRole("radio", { name: /\d:\d\d/ })
        .find(
          (radio) => (radio as HTMLInputElement).checked,
        ) as HTMLInputElement
    ).value;
    await expect(slotRadio(canvas, slot)).toHaveAccessibleName(
      slotTimeLabel(slot, newYork, locale),
    );

    await userEvent.click(
      zones.getByRole("radio", { name: new RegExp(t.SlotPicker.masterZone) }),
    );
    await waitFor(() =>
      expect(slotRadio(canvas, slot)).toHaveAccessibleName(
        slotTimeLabel(slot, "Europe/Kyiv", locale),
      ),
    );
    await expect(slotRadio(canvas, slot)).toBeChecked();
    await expect(fetchAvailableSlots).toHaveBeenLastCalledWith(
      "gel",
      expect.any(String),
      "Europe/Kyiv",
    );

    await userEvent.click(own);
    await waitFor(() =>
      expect(slotRadio(canvas, slot)).toHaveAccessibleName(
        slotTimeLabel(slot, newYork, locale),
      ),
    );
    await userEvent.click(canvas.getByRole("button", { name: t.Landing.next }));
    const dialog = within(await canvas.findByRole("dialog"));
    await expect(
      dialog.getByText(new RegExp(zoneLabel(newYork, locale))),
    ).toBeVisible();
    await sendContact(context);
    await expect(startBooking).toHaveBeenCalledWith(
      expect.objectContaining({ slot, timeZone: newYork }),
    );
  },
};

export const OnlineInClientZoneEnglish: Story = {
  ...OnlineInClientZone,
  globals: { locale: "en" },
};

export const OnlineInMasterZone: Story = {
  args: { service: onlineService },
  beforeEach: () => {
    mocked(useBrowserTimeZone).mockReturnValue("Europe/Kyiv");
  },
  play: async ({ canvas, globals }) => {
    const t = texts(globals.locale).SlotPicker;
    await canvas.findByRole("group", { name: t.dates });
    await expect(canvas.queryByRole("group", { name: t.zones })).toBeNull();
  },
};

export const InPersonFromAnotherZone: Story = {
  beforeEach: () => {
    mocked(useBrowserTimeZone).mockReturnValue(newYork);
  },
  play: async ({ canvas, globals }) => {
    const t = texts(globals.locale).SlotPicker;
    const locale = isLocale(globals.locale) ? globals.locale : "uk";
    await canvas.findByRole("group", { name: t.dates });
    await expect(canvas.queryByRole("group", { name: t.zones })).toBeNull();
    await expect(
      canvas.getByText(zoneLabel("Europe/Kyiv", locale)),
    ).toBeVisible();
  },
};
