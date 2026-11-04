import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { expect, mocked, screen, waitFor, within } from "storybook/test";
import { Toaster } from "@/components/ui/sonner";
import {
  overflowsX,
  restoreOnLine,
  settle,
  stubOnLine,
} from "@/components/ui/story-helpers";
import { saveTemplateDays } from "./actions";
import { ScheduleScreen } from "./schedule-screen";
import {
  dayRow,
  localeOf,
  scheduleFormatterOf,
  scheduleStories,
  scheduleTextsOf,
  scheduleView,
  toastsOf,
} from "./story-schedule";
import { appointmentLine, type ScheduleData } from "./view";

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
  settle();
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
    await expect(within(dialog).getByText(s.day.offHint)).toBeVisible();

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
    await expect(
      within(dialog).getByText(format("outside.outside", { count: 1 })),
    ).toBeVisible();
    const olena = view.appointments.find((a) => a.id === "olena")!;
    await expect(within(dialog).getByRole("listitem")).toHaveTextContent(
      appointmentLine(olena, locale),
    );
    await expect(
      within(dialog).getByRole("button", { name: s.save }),
    ).toBeEnabled();
  },
};

export const DayOffGridValue: Story = {
  parameters: { data: scheduleStories.offGrid },
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
