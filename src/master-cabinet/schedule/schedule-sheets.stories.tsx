import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  expect,
  fireEvent,
  mocked,
  screen,
  waitFor,
  within,
} from "storybook/test";
import { Toaster } from "@/components/ui/sonner";
import {
  overflowsX,
  restoreOnLine,
  settle,
  stubOnLine,
} from "@/components/ui/story-helpers";
import {
  deleteException,
  saveException,
  saveTemplateDays,
  setAutoConfirm,
  updateBookingParam,
} from "./actions";
import { ScheduleScreen } from "./schedule-screen";
import {
  dayRow,
  exceptionRow,
  localeOf,
  paramRow,
  scheduleFormatterOf,
  scheduleStories,
  scheduleTextsOf,
  scheduleView,
  toastsOf,
} from "./story-schedule";
import {
  appointmentLine,
  paramLabel,
  type ParamKey,
  type ScheduleData,
} from "./view";

const saved = { toast: { type: "success", key: "settingsSaved" } } as const;

const meta = {
  title: "MasterCabinet/ScheduleSheets",
  component: ScheduleScreen,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
    data: scheduleStories.filled,
  },
  globals: { viewport: { value: "mobile360" } },
  args: {
    view: scheduleView(scheduleStories.filled, "uk"),
    theme: "system",
    email: "master@example.com",
  },
  beforeEach: () => {
    mocked(usePathname).mockReturnValue("/app/schedule");
    return () => toast.dismiss();
  },
  render: (args, { globals, parameters }) => (
    <div className="p-4">
      <Toaster />
      <ScheduleScreen
        {...args}
        view={scheduleView(
          parameters.data as ScheduleData,
          localeOf(globals.locale),
        )}
      />
    </div>
  ),
} satisfies Meta<typeof ScheduleScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

type User = Parameters<NonNullable<Story["play"]>>[0]["userEvent"];

const openDay = async (canvas: HTMLElement, user: User, name: string) => {
  await user.click(dayRow(canvas, name));
  const dialog = await screen.findByRole("dialog", { name });
  await waitFor(() => {
    settle();
    expect(dialog).toBeVisible();
  });
  return dialog;
};

const interval = (dialog: HTMLElement, n: number, locale: unknown) =>
  within(dialog).getByRole("group", {
    name: scheduleFormatterOf(locale)("intervals.row", { n }),
  });

const pick = async (user: User, trigger: HTMLElement, time: string) => {
  await user.click(trigger);
  await user.click(await screen.findByRole("option", { name: time }));
};

const mondayName = (locale: unknown) =>
  scheduleView(scheduleStories.filled, localeOf(locale)).days[0].name;

export const DayApplyToOthers: Story = {
  beforeEach: () => {
    mocked(saveTemplateDays).mockResolvedValue(saved);
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const t = scheduleTextsOf(globals.locale);
    const s = t.schedule;
    const view = scheduleView(scheduleStories.filled, localeOf(globals.locale));
    const dialog = await openDay(
      canvasElement,
      userEvent,
      mondayName(globals.locale),
    );
    const save = within(dialog).getByRole("button", { name: s.save });
    await expect(save).toBeDisabled();
    await expect(
      within(dialog).getByRole("switch", { name: s.day.working }),
    ).toBeChecked();

    const monday = within(dialog).getByRole("button", {
      name: view.days[0].short,
    });
    await expect(monday).toHaveAttribute("aria-pressed", "true");
    await expect(monday).toBeDisabled();
    for (const day of view.days.slice(1, 5)) {
      await expect(
        within(dialog).getByRole("button", { name: day.short }),
      ).toHaveAttribute("aria-pressed", "false");
    }
    for (const day of view.days.slice(1, 5)) {
      await userEvent.click(
        within(dialog).getByRole("button", { name: day.short }),
      );
    }
    await expect(save).toBeEnabled();
    await userEvent.click(save);
    await waitFor(() =>
      expect(
        screen.getByText(toastsOf(globals.locale).settingsSaved),
      ).toBeVisible(),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const data = mocked(saveTemplateDays).mock.calls[0][1];
    await expect(data.getAll("weekdays")).toEqual(["1", "2", "3", "4", "5"]);
    await expect(data.get("hours")).toBe("{[600,840),[900,1140)}");
  },
};

export const DayTurnedOff: Story = {
  beforeEach: () => {
    mocked(saveTemplateDays).mockResolvedValue(saved);
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = scheduleTextsOf(globals.locale).schedule;
    const view = scheduleView(scheduleStories.filled, localeOf(globals.locale));
    const dialog = await openDay(canvasElement, userEvent, view.days[5].name);
    const working = within(dialog).getByRole("switch", {
      name: s.day.working,
    });
    await expect(working).toBeChecked();

    await userEvent.click(
      within(dialog).getByRole("button", { name: s.intervals.remove }),
    );
    await expect(working).not.toBeChecked();
    await expect(working).toHaveFocus();
    await waitFor(() =>
      expect(within(dialog).getByText(s.day.offHint)).toBeVisible(),
    );

    await userEvent.click(working);
    await expect(working).toBeChecked();
    const row = interval(dialog, 1, globals.locale);
    await expect(
      within(row).getByRole("combobox", {
        name: s.intervals.start,
      }),
    ).toHaveTextContent("10:00");
    await expect(
      within(row).getByRole("combobox", { name: s.intervals.end }),
    ).toHaveTextContent("19:00");

    await userEvent.click(working);
    await expect(working).not.toBeChecked();
    await userEvent.click(within(dialog).getByRole("button", { name: s.save }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const data = mocked(saveTemplateDays).mock.calls[0][1];
    await expect(data.get("hours")).toBe("{}");
    await expect(data.getAll("weekdays")).toEqual(["6"]);
  },
};

export const DayInvalidIntervals: Story = {
  beforeEach: () => {
    mocked(saveTemplateDays).mockImplementation(async (_state, formData) => ({
      fieldError: "intervalsInvalid",
      submittedHours: String(formData.get("hours")),
    }));
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = scheduleTextsOf(globals.locale).schedule;
    const dialog = await openDay(
      canvasElement,
      userEvent,
      mondayName(globals.locale),
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: s.intervals.add }),
    );
    await userEvent.click(within(dialog).getByRole("button", { name: s.save }));
    await expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      s.intervals.invalid,
    );
    const first = within(interval(dialog, 1, globals.locale)).getByRole(
      "combobox",
      { name: s.intervals.start },
    );
    await expect(first).toHaveAttribute("aria-invalid", "true");
    await waitFor(() => expect(first).toHaveFocus());
    await expect(screen.getByRole("dialog")).toBe(dialog);

    await pick(userEvent, first, "10:15");
    await expect(within(dialog).queryByRole("alert")).toBeNull();
    await expect(first).not.toHaveAttribute("aria-invalid");
  },
};

export const DayOutsideAppointments: Story = {
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = scheduleTextsOf(globals.locale).schedule;
    const format = scheduleFormatterOf(globals.locale);
    const locale = localeOf(globals.locale);
    const view = scheduleView(scheduleStories.filled, locale);
    const dialog = await openDay(
      canvasElement,
      userEvent,
      mondayName(globals.locale),
    );
    await expect(
      within(dialog).queryByText(format("outside.outside", { count: 1 })),
    ).toBeNull();

    await userEvent.click(
      within(
        within(dialog).getByRole("group", {
          name: format("intervals.row", { n: 2 }),
        }),
      ).getByRole("button", { name: s.intervals.remove }),
    );
    await waitFor(() =>
      expect(
        within(dialog).getByText(format("outside.outside", { count: 1 })),
      ).toBeVisible(),
    );
    const olena = view.appointments.find((a) => a.id === "olena")!;
    await expect(within(dialog).getByRole("listitem")).toHaveTextContent(
      appointmentLine(olena, locale),
    );
    await expect(
      within(dialog).getByRole("button", { name: s.save }),
    ).toBeEnabled();
  },
};

export const DayRemoveIntervalFocus: Story = {
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = scheduleTextsOf(globals.locale).schedule;
    const dialog = await openDay(
      canvasElement,
      userEvent,
      mondayName(globals.locale),
    );
    await userEvent.click(
      within(interval(dialog, 1, globals.locale)).getByRole("button", {
        name: s.intervals.remove,
      }),
    );
    await expect(
      within(dialog).getByRole("button", { name: s.intervals.add }),
    ).toHaveFocus();
  },
};

export const DayOffGridValue: Story = {
  parameters: { data: scheduleStories.offGrid },
  beforeEach: () => {
    mocked(saveTemplateDays).mockResolvedValue(saved);
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = scheduleTextsOf(globals.locale).schedule;
    const dialog = await openDay(
      canvasElement,
      userEvent,
      mondayName(globals.locale),
    );
    await expect(
      within(interval(dialog, 1, globals.locale)).getByRole("combobox", {
        name: s.intervals.start,
      }),
    ).toHaveTextContent("09:10");
    const save = within(dialog).getByRole("button", { name: s.save });
    await expect(save).toBeDisabled();
    await userEvent.click(
      within(dialog).getByRole("button", { name: s.intervals.add }),
    );
    await expect(save).toBeEnabled();
    await expect(
      within(interval(dialog, 1, globals.locale)).getByRole("combobox", {
        name: s.intervals.start,
      }),
    ).toHaveTextContent("09:10");
    await userEvent.click(save);
    await waitFor(() => expect(saveTemplateDays).toHaveBeenCalled());
    const data = mocked(saveTemplateDays).mock.calls[0][1];
    await expect(data.get("hours")).toBe("{[550,840),[900,1140)}");
  },
};

export const DayThreeIntervalsRu: Story = {
  parameters: { data: scheduleStories.threeIntervals },
  globals: { locale: "ru" },
  play: async ({ canvasElement, userEvent, globals }) => {
    const name = mondayName(globals.locale);
    await expect(overflowsX(dayRow(canvasElement, name))).toBe(false);
    const dialog = await openDay(canvasElement, userEvent, name);
    await expect(within(dialog).getAllByRole("combobox")).toHaveLength(6);
    await expect(overflowsX(dialog)).toBe(false);
    await expect(overflowsX(document.body)).toBe(false);
  },
};

export const DayOffline: Story = {
  beforeEach: () => {
    stubOnLine(false);
    return restoreOnLine;
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const t = scheduleTextsOf(globals.locale);
    const dialog = await openDay(
      canvasElement,
      userEvent,
      mondayName(globals.locale),
    );
    await expect(
      within(dialog).getByRole("button", { name: t.schedule.save }),
    ).toBeDisabled();
    await waitFor(() => expect(dialog).toHaveTextContent(t.offline));
    await expect(
      dialog.querySelector("[data-slot=sheet-body]"),
    ).toHaveAttribute("tabindex", "0");
  },
};

const openAdd = async (canvas: HTMLElement, user: User, locale: unknown) => {
  const s = scheduleTextsOf(locale).schedule;
  await user.click(
    within(canvas).getByRole("button", { name: s.exceptions.add }),
  );
  const dialog = await screen.findByRole("dialog", {
    name: s.exception.titleNew,
  });
  await waitFor(() => {
    settle();
    expect(dialog).toBeVisible();
  });
  return dialog;
};

const openPeriod = async (
  canvas: HTMLElement,
  user: User,
  locale: unknown,
  data: ScheduleData,
  index: number,
) => {
  const dates = scheduleView(data, localeOf(locale)).periods[index].dates;
  await user.click(exceptionRow(canvas, dates));
  const dialog = await screen.findByRole("dialog", {
    name: scheduleTextsOf(locale).schedule.exception.titleEdit,
  });
  await waitFor(() => {
    settle();
    expect(dialog).toBeVisible();
  });
  return dialog;
};

const typeDate = (dialog: HTMLElement, label: string, value: string) =>
  fireEvent.change(within(dialog).getByLabelText(label), {
    target: { value },
  });

const blurDate = (dialog: HTMLElement, label: string) => {
  const input = within(dialog).getByLabelText(label);
  fireEvent.blur(input);
  fireEvent.focusOut(input);
};

const setDate = (dialog: HTMLElement, label: string, value: string) => {
  typeDate(dialog, label, value);
  blurDate(dialog, label);
};

export const ExceptionTypedDates: Story = {
  beforeEach: () => {
    mocked(saveException).mockResolvedValue(saved);
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = scheduleTextsOf(globals.locale).schedule;
    const dialog = await openAdd(canvasElement, userEvent, globals.locale);
    const from = within(dialog).getByLabelText(s.exception.from);
    const to = within(dialog).getByLabelText(s.exception.to);

    // Chromium reports the day typed so far as a whole date, before the next digit.
    typeDate(dialog, s.exception.from, "2026-11-01");
    await expect(from).toHaveValue("2026-11-01");
    typeDate(dialog, s.exception.from, "2026-11-15");
    await expect(from).toHaveValue("2026-11-15");
    blurDate(dialog, s.exception.from);
    await expect(from).toHaveValue("2026-11-15");
    await expect(to).toHaveValue("2026-11-15");

    typeDate(dialog, s.exception.to, "2026-11-10");
    await expect(to).toHaveValue("2026-11-10");
    blurDate(dialog, s.exception.to);
    await expect(to).toHaveValue("2026-11-15");

    typeDate(dialog, s.exception.to, "");
    blurDate(dialog, s.exception.to);
    await expect(to).toHaveValue("2026-11-15");

    typeDate(dialog, s.exception.from, "2026-10-01");
    blurDate(dialog, s.exception.from);
    await expect(from).toHaveValue("2026-11-04");
    await expect(to).toHaveValue("2026-11-15");

    typeDate(dialog, s.exception.to, "2026-11-20");
    await userEvent.click(within(dialog).getByRole("button", { name: s.save }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const data = mocked(saveException).mock.calls[0][1];
    await expect(data.get("from")).toBe("2026-11-04");
    await expect(data.get("to")).toBe("2026-11-20");
  },
};

export const ExceptionAddOff: Story = {
  beforeEach: () => {
    mocked(saveException).mockResolvedValue(saved);
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = scheduleTextsOf(globals.locale).schedule;
    const dialog = await openAdd(canvasElement, userEvent, globals.locale);
    const from = within(dialog).getByLabelText(s.exception.from);
    const to = within(dialog).getByLabelText(s.exception.to);
    await expect(from).toHaveValue("2026-11-05");
    await expect(to).toHaveValue("2026-11-05");
    await expect(from).toHaveAttribute("min", "2026-11-04");
    await expect(to).toHaveAttribute("min", "2026-11-05");
    await expect(
      within(dialog).getByRole("button", { name: s.exception.off }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      within(dialog).queryByRole("button", { name: s.exception.delete }),
    ).toBeNull();
    await expect(
      within(dialog).queryByRole("group", {
        name: scheduleFormatterOf(globals.locale)("intervals.row", { n: 1 }),
      }),
    ).toBeNull();

    await userEvent.click(within(dialog).getByRole("button", { name: s.save }));
    await waitFor(() =>
      expect(
        screen.getByText(toastsOf(globals.locale).settingsSaved),
      ).toBeVisible(),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const data = mocked(saveException).mock.calls[0][1];
    await expect(data.get("kind")).toBe("off");
    await expect(data.get("from")).toBe("2026-11-05");
    await expect(data.get("to")).toBe("2026-11-05");
    await expect(data.get("hours")).toBe("{}");
    await expect(data.get("replacedFrom")).toBeNull();
  },
};

export const ExceptionVacationWithAppointments: Story = {
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = scheduleTextsOf(globals.locale).schedule;
    const format = scheduleFormatterOf(globals.locale);
    const locale = localeOf(globals.locale);
    const view = scheduleView(scheduleStories.filled, locale);
    const dialog = await openPeriod(
      canvasElement,
      userEvent,
      globals.locale,
      scheduleStories.filled,
      1,
    );
    await expect(within(dialog).getByLabelText(s.exception.from)).toHaveValue(
      "2026-11-25",
    );
    await expect(within(dialog).getByLabelText(s.exception.to)).toHaveValue(
      "2026-12-02",
    );
    await waitFor(() =>
      expect(
        within(dialog).getByText(format("exception.span", { count: 8 }), {
          exact: false,
        }),
      ).toBeVisible(),
    );
    await waitFor(() =>
      expect(
        within(dialog).getByText(format("outside.outside", { count: 2 })),
      ).toBeVisible(),
    );
    const items = within(dialog).getAllByRole("listitem");
    await expect(items).toHaveLength(2);
    for (const id of ["iryna", "sofia"]) {
      const appointment = view.appointments.find((a) => a.id === id)!;
      await expect(dialog).toHaveTextContent(
        appointmentLine(appointment, locale),
      );
    }
    await expect(
      within(dialog).getByRole("button", { name: s.save }),
    ).toBeDisabled();
    await expect(overflowsX(dialog)).toBe(false);
  },
};

export const ExceptionVacationWithAppointmentsRu: Story = {
  ...ExceptionVacationWithAppointments,
  globals: { locale: "ru" },
};

export const ExceptionSpecialHours: Story = {
  beforeEach: () => {
    mocked(saveException).mockImplementation(async (_state, formData) =>
      String(formData.get("hours")) === "{}"
        ? { fieldError: "intervalsInvalid", submittedHours: "{}" }
        : saved,
    );
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = scheduleTextsOf(globals.locale).schedule;
    const dialog = await openAdd(canvasElement, userEvent, globals.locale);
    await userEvent.click(
      within(dialog).getByRole("button", { name: s.exception.hours }),
    );
    const row = interval(dialog, 1, globals.locale);
    await expect(
      within(row).getByRole("combobox", { name: s.intervals.start }),
    ).toHaveTextContent("10:00");
    await expect(
      within(row).getByRole("combobox", { name: s.intervals.end }),
    ).toHaveTextContent("19:00");

    await userEvent.click(
      within(dialog).getByRole("button", { name: s.intervals.remove }),
    );
    await expect(
      within(dialog).getByRole("button", { name: s.intervals.add }),
    ).toHaveFocus();
    await userEvent.click(within(dialog).getByRole("button", { name: s.save }));
    await expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      s.intervals.empty,
    );
    await expect(screen.getByRole("dialog")).toBe(dialog);
    await expect(
      within(dialog).getByRole("button", { name: s.intervals.add }),
    ).toHaveAccessibleDescription(s.intervals.empty);

    await userEvent.click(
      within(dialog).getByRole("button", { name: s.intervals.add }),
    );
    await expect(within(dialog).queryByRole("alert")).toBeNull();
    await userEvent.click(within(dialog).getByRole("button", { name: s.save }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const data = mocked(saveException).mock.calls[1][1];
    await expect(data.get("kind")).toBe("hours");
    await expect(data.get("hours")).toBe("{[600,1140)}");
  },
};

export const ExceptionReplaces: Story = {
  play: async ({ canvasElement, userEvent, globals }) => {
    const format = scheduleFormatterOf(globals.locale);
    const s = scheduleTextsOf(globals.locale).schedule;
    const view = scheduleView(scheduleStories.filled, localeOf(globals.locale));
    const dialog = await openAdd(canvasElement, userEvent, globals.locale);
    const replaces = format("exception.replaces", {
      periods: view.periods[1].dates,
    });
    await expect(within(dialog).queryByText(replaces)).toBeNull();

    setDate(dialog, s.exception.from, "2026-11-27");
    await expect(within(dialog).getByLabelText(s.exception.to)).toHaveValue(
      "2026-11-27",
    );
    await waitFor(() =>
      expect(within(dialog).getByText(replaces)).toBeVisible(),
    );
  },
};

export const ExceptionShortened: Story = {
  parameters: { data: scheduleStories.releasedDay },
  beforeEach: () => {
    mocked(saveException).mockResolvedValue(saved);
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = scheduleTextsOf(globals.locale).schedule;
    const format = scheduleFormatterOf(globals.locale);
    const locale = localeOf(globals.locale);
    const view = scheduleView(scheduleStories.releasedDay, locale);
    const dialog = await openPeriod(
      canvasElement,
      userEvent,
      globals.locale,
      scheduleStories.releasedDay,
      1,
    );
    await waitFor(() =>
      expect(
        within(dialog).getByText(format("outside.outside", { count: 3 })),
      ).toBeVisible(),
    );

    setDate(dialog, s.exception.to, "2026-11-28");
    const warning = await waitFor(() =>
      within(dialog).getByText(format("outside.outside", { count: 2 })),
    );
    const items = within(warning).getAllByRole("listitem");
    await expect(items).toHaveLength(2);
    const kateryna = view.appointments.find((a) => a.id === "kateryna")!;
    await expect(warning).toHaveTextContent(appointmentLine(kateryna, locale));
    const sofia = view.appointments.find((a) => a.id === "sofia")!;
    await expect(warning).not.toHaveTextContent(appointmentLine(sofia, locale));

    await userEvent.click(within(dialog).getByRole("button", { name: s.save }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const data = mocked(saveException).mock.calls[0][1];
    await expect(data.get("from")).toBe("2026-11-25");
    await expect(data.get("to")).toBe("2026-11-28");
    await expect(data.get("replacedFrom")).toBe("2026-11-25");
    await expect(data.get("replacedTo")).toBe("2026-12-02");
  },
};

export const ExceptionDeleteWarns: Story = {
  parameters: { data: scheduleStories.widerHours },
  beforeEach: () => {
    mocked(deleteException).mockResolvedValue({
      toast: { type: "success", key: "exceptionDeleted" },
    });
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = scheduleTextsOf(globals.locale).schedule;
    const format = scheduleFormatterOf(globals.locale);
    const locale = localeOf(globals.locale);
    const view = scheduleView(scheduleStories.widerHours, locale);
    const dialog = await openPeriod(
      canvasElement,
      userEvent,
      globals.locale,
      scheduleStories.widerHours,
      0,
    );
    await expect(
      within(dialog).queryByText(format("outside.outside", { count: 1 })),
    ).toBeNull();
    await waitFor(() =>
      expect(
        within(dialog).getByText(format("outside.afterDelete", { count: 1 })),
      ).toBeVisible(),
    );
    await expect(within(dialog).getByRole("listitem")).toHaveTextContent(
      appointmentLine(
        view.appointments.find((a) => a.id === "marichka")!,
        locale,
      ),
    );
    await expect(
      within(dialog).getByRole("button", { name: s.save }),
    ).toBeDisabled();

    await userEvent.click(
      within(dialog).getByRole("button", { name: s.exception.delete }),
    );
    await waitFor(() =>
      expect(
        screen.getByText(toastsOf(globals.locale).exceptionDeleted),
      ).toBeVisible(),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const data = mocked(deleteException).mock.calls[0][1];
    await expect(data.get("from")).toBe("2026-12-05");
    await expect(data.get("to")).toBe("2026-12-05");
    await expect(saveException).not.toHaveBeenCalled();
  },
};

export const ExceptionTooLong: Story = {
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = scheduleTextsOf(globals.locale).schedule;
    const format = scheduleFormatterOf(globals.locale);
    const dialog = await openAdd(canvasElement, userEvent, globals.locale);
    const save = within(dialog).getByRole("button", { name: s.save });
    await expect(save).toBeEnabled();

    setDate(dialog, s.exception.to, "2027-11-05");
    await expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      format("exception.tooLong", { max: 365 }),
    );
    await expect(save).toBeDisabled();

    setDate(dialog, s.exception.to, "2027-11-04");
    await waitFor(() => expect(within(dialog).queryByRole("alert")).toBeNull());
    await expect(save).toBeEnabled();
  },
};

export const ExceptionOffline: Story = {
  beforeEach: () => {
    stubOnLine(false);
    return restoreOnLine;
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const t = scheduleTextsOf(globals.locale);
    const s = t.schedule;
    const dialog = await openPeriod(
      canvasElement,
      userEvent,
      globals.locale,
      scheduleStories.filled,
      1,
    );
    await expect(
      within(dialog).getByRole("button", { name: s.save }),
    ).toBeDisabled();
    await expect(
      within(dialog).getByRole("button", { name: s.exception.delete }),
    ).toBeDisabled();
    await waitFor(() => expect(dialog).toHaveTextContent(t.offline));
    await expect(
      dialog.querySelector("[data-slot=sheet-body]"),
    ).toHaveAttribute("tabindex", "0");
  },
};

const openParam = async (
  canvas: HTMLElement,
  user: User,
  locale: unknown,
  key: ParamKey,
) => {
  const label = scheduleTextsOf(locale).schedule.params[key].label;
  await user.click(paramRow(canvas, label));
  const dialog = await screen.findByRole("dialog", { name: label });
  await waitFor(() => {
    settle();
    expect(dialog).toBeVisible();
  });
  return dialog;
};

const optionName = (locale: unknown, key: ParamKey, value: number): string =>
  paramLabel(key, value, localeOf(locale)) ??
  scheduleTextsOf(locale).schedule.params[
    key === "notice" ? "noLimit" : "untilStart"
  ];

export const ParamNotice: Story = {
  beforeEach: () => {
    mocked(updateBookingParam).mockResolvedValue(saved);
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = scheduleTextsOf(globals.locale).schedule;
    const dialog = await openParam(
      canvasElement,
      userEvent,
      globals.locale,
      "notice",
    );
    await waitFor(() =>
      expect(within(dialog).getByText(s.params.notice.hint)).toBeVisible(),
    );
    await expect(
      within(dialog).getByRole("radio", {
        name: optionName(globals.locale, "notice", 120),
      }),
    ).toBeChecked();
    const save = within(dialog).getByRole("button", { name: s.save });
    await expect(save).toBeDisabled();

    await userEvent.click(
      within(dialog).getByRole("radio", {
        name: optionName(globals.locale, "notice", 1440),
      }),
    );
    await expect(save).toBeEnabled();
    await userEvent.click(save);
    await waitFor(() =>
      expect(
        screen.getByText(toastsOf(globals.locale).settingsSaved),
      ).toBeVisible(),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const data = mocked(updateBookingParam).mock.calls[0][1];
    await expect(data.get("key")).toBe("notice");
    await expect(data.get("value")).toBe("1440");
  },
};

export const ParamDeadlineWarns: Story = {
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = scheduleTextsOf(globals.locale).schedule;
    const dialog = await openParam(
      canvasElement,
      userEvent,
      globals.locale,
      "deadline",
    );
    await expect(
      within(dialog).queryByText(s.params.deadlineWarning),
    ).toBeNull();
    await userEvent.click(
      within(dialog).getByRole("radio", {
        name: optionName(globals.locale, "deadline", 1440),
      }),
    );
    await waitFor(() =>
      expect(within(dialog).getByText(s.params.deadlineWarning)).toBeVisible(),
    );
    await userEvent.click(
      within(dialog).getByRole("radio", {
        name: optionName(globals.locale, "deadline", 720),
      }),
    );
    await expect(
      within(dialog).queryByText(s.params.deadlineWarning),
    ).toBeNull();
    await expect(
      within(dialog).getByRole("button", { name: s.save }),
    ).toBeDisabled();
  },
};

export const ParamOffListValue: Story = {
  parameters: { data: scheduleStories.offListParam },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = scheduleTextsOf(globals.locale).schedule;
    const text = optionName(globals.locale, "notice", 45);
    await expect(
      paramRow(canvasElement, s.params.notice.label),
    ).toHaveTextContent(text);
    const dialog = await openParam(
      canvasElement,
      userEvent,
      globals.locale,
      "notice",
    );
    await expect(
      within(dialog).getByRole("radio", { name: text }),
    ).toBeChecked();
    await expect(
      within(dialog).getByRole("button", { name: s.save }),
    ).toBeDisabled();
  },
};

export const ParamZeroLabels: Story = {
  parameters: { data: scheduleStories.zeroParams },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = scheduleTextsOf(globals.locale).schedule;
    await expect(
      paramRow(canvasElement, s.params.notice.label),
    ).toHaveTextContent(s.params.noLimit);
    await expect(
      paramRow(canvasElement, s.params.deadline.label),
    ).toHaveTextContent(s.params.untilStart);
    const dialog = await openParam(
      canvasElement,
      userEvent,
      globals.locale,
      "deadline",
    );
    await expect(
      within(dialog).getByRole("radio", { name: s.params.untilStart }),
    ).toBeChecked();
  },
};

const autoConfirmSwitch = (canvas: HTMLElement, label: string) =>
  within(canvas).getByRole("switch", { name: label });

export const AutoConfirmOff: Story = {
  beforeEach: () => {
    // Held open so the requested value stays on screen; released on teardown so no transition leaks into the next story.
    let release: () => void = () => {};
    mocked(setAutoConfirm).mockImplementation(
      () => new Promise((resolve) => (release = () => resolve({}))),
    );
    return () => release();
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = scheduleTextsOf(globals.locale).schedule;
    const toggle = autoConfirmSwitch(canvasElement, s.autoConfirm.label);
    await expect(toggle).toBeChecked();
    await waitFor(() =>
      expect(within(canvasElement).getByText(s.autoConfirm.on)).toBeVisible(),
    );

    await userEvent.click(toggle);
    await waitFor(() => expect(toggle).not.toBeChecked());
    await expect(toggle).toHaveAttribute("aria-disabled", "true");
    await waitFor(() =>
      expect(within(canvasElement).getByText(s.autoConfirm.off)).toBeVisible(),
    );
    const data = mocked(setAutoConfirm).mock.calls[0][1];
    await expect(data.get("autoConfirm")).toBe("false");
  },
};

export const AutoConfirmSaved: Story = {
  parameters: { data: scheduleStories.autoConfirmOff },
  beforeEach: () => {
    mocked(setAutoConfirm).mockResolvedValue(saved);
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = scheduleTextsOf(globals.locale).schedule;
    const toggle = autoConfirmSwitch(canvasElement, s.autoConfirm.label);
    await expect(toggle).not.toBeChecked();
    await userEvent.click(toggle);
    await waitFor(() =>
      expect(
        screen.getByText(toastsOf(globals.locale).settingsSaved),
      ).toBeVisible(),
    );
    const data = mocked(setAutoConfirm).mock.calls[0][1];
    await expect(data.get("autoConfirm")).toBe("true");
  },
};

export const AutoConfirmFails: Story = {
  beforeEach: () => {
    mocked(setAutoConfirm).mockResolvedValue({
      toast: { type: "error", key: "unexpected" },
    });
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = scheduleTextsOf(globals.locale).schedule;
    const toggle = autoConfirmSwitch(canvasElement, s.autoConfirm.label);
    await userEvent.click(toggle);
    await waitFor(() =>
      expect(
        screen.getByText(toastsOf(globals.locale).unexpected),
      ).toBeVisible(),
    );
    await waitFor(() => expect(toggle).toBeChecked());
    await expect(toggle).not.toHaveAttribute("aria-disabled");
    await waitFor(() =>
      expect(within(canvasElement).getByText(s.autoConfirm.on)).toBeVisible(),
    );
  },
};

export const AutoConfirmOffline: Story = {
  beforeEach: () => {
    stubOnLine(false);
    return restoreOnLine;
  },
  play: async ({ canvasElement, globals }) => {
    const s = scheduleTextsOf(globals.locale).schedule;
    await waitFor(() =>
      expect(
        autoConfirmSwitch(canvasElement, s.autoConfirm.label),
      ).toHaveAttribute("aria-disabled", "true"),
    );
  },
};
