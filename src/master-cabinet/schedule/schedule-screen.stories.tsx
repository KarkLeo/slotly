import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { usePathname } from "next/navigation";
import { expect, mocked, within } from "storybook/test";
import { overflowsX } from "@/components/ui/story-helpers";
import { ScheduleScreen } from "./schedule-screen";
import {
  dayRow,
  exceptionRow,
  localeOf,
  scheduleFormatterOf,
  scheduleStories,
  scheduleTextsOf,
  scheduleView,
} from "./story-schedule";
import type { ScheduleData } from "./view";

const meta = {
  title: "MasterCabinet/ScheduleScreen",
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
  },
  render: (args, { globals, parameters }) => (
    <div className="p-4">
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

export const Filled: Story = {
  play: async ({ canvasElement, globals }) => {
    const t = scheduleTextsOf(globals.locale);
    const s = t.schedule;
    const format = scheduleFormatterOf(globals.locale);
    const view = scheduleView(scheduleStories.filled, localeOf(globals.locale));
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { level: 1, name: t.sections.schedule }),
    ).toBeVisible();

    const group = canvas.getByRole("region", { name: s.groups.template });
    await expect(within(group).getAllByRole("button")).toHaveLength(7);
    for (const day of view.days) {
      const row = dayRow(group, day.name);
      await expect(row).toHaveTextContent(day.label ?? s.dayOff);
    }
    await expect(dayRow(group, view.days[0].name)).toHaveTextContent(
      "10:00–14:00, 15:00–19:00",
    );
    await expect(dayRow(group, view.days[6].name)).toHaveTextContent(s.dayOff);
    await expect(
      canvas.getByText(format("zoneNote", { zone: view.zone })),
    ).toBeVisible();
    await expect(canvas.queryByText(s.emptyTemplate)).toBeNull();
    await expect(canvas.queryByRole("link")).toBeNull();
    await expect(overflowsX(document.documentElement)).toBe(false);
  },
};

export const FilledZoneNote: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText(
        "Час у вашому поясі: Kyiv. Змінити пояс можна в «Налаштуваннях».",
      ),
    ).toBeVisible();
  },
};

export const FilledRu: Story = { ...Filled, globals: { locale: "ru" } };

export const FilledEn: Story = { ...Filled, globals: { locale: "en" } };

export const EmptyTemplate: Story = {
  parameters: { data: scheduleStories.emptyTemplate },
  play: async ({ canvasElement, globals }) => {
    const s = scheduleTextsOf(globals.locale).schedule;
    const canvas = within(canvasElement);
    const warning = canvas.getByText(s.emptyTemplate);
    await expect(warning).toBeVisible();
    const group = canvas.getByRole("region", { name: s.groups.template });
    const list = within(group).getAllByRole("button")[0].parentElement!;
    await expect(list.contains(warning)).toBe(false);
    await expect(
      warning.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    await expect(within(group).getAllByText(s.dayOff)).toHaveLength(7);
  },
};

export const Exceptions: Story = {
  play: async ({ canvasElement, globals }) => {
    const s = scheduleTextsOf(globals.locale).schedule;
    const format = scheduleFormatterOf(globals.locale);
    const view = scheduleView(scheduleStories.filled, localeOf(globals.locale));
    const canvas = within(canvasElement);
    const group = canvas.getByRole("region", { name: s.groups.exceptions });
    await expect(within(group).getAllByRole("button")).toHaveLength(4);
    await expect(exceptionRow(group, view.periods[0].dates)).toHaveTextContent(
      s.dayOff,
    );
    const vacation = exceptionRow(group, view.periods[1].dates);
    await expect(vacation).toHaveTextContent(
      format("exceptions.offRange", { count: 8 }),
    );
    await expect(vacation).toHaveTextContent(
      format("exceptions.outsideBadge", { count: 2 }),
    );
    await expect(exceptionRow(group, view.periods[2].dates)).toHaveTextContent(
      "10:00–14:00",
    );
    await expect(
      within(group).getByRole("button", { name: s.exceptions.add }),
    ).toBeVisible();
    await expect(canvas.queryByText(s.exceptions.empty)).toBeNull();
    await expect(overflowsX(document.documentElement)).toBe(false);
  },
};

export const ExceptionsRu: Story = {
  ...Exceptions,
  globals: { locale: "ru" },
};

export const ExceptionsEmpty: Story = {
  parameters: { data: scheduleStories.noExceptions },
  play: async ({ canvasElement, globals }) => {
    const s = scheduleTextsOf(globals.locale).schedule;
    const canvas = within(canvasElement);
    await expect(canvas.getByText(s.exceptions.empty)).toBeVisible();
    const group = canvas.getByRole("region", { name: s.groups.exceptions });
    await expect(within(group).getAllByRole("button")).toHaveLength(1);
    await expect(
      within(group).getByRole("button", { name: s.exceptions.add }),
    ).toBeVisible();
  },
};
