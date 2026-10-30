import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  expect,
  fireEvent,
  mocked,
  screen,
  waitFor,
  within,
} from "storybook/test";
import en from "../../../messages/en.json";
import ru from "../../../messages/ru.json";
import uk from "../../../messages/uk.json";
import {
  overflowsX,
  restoreOnLine,
  stubOnLine,
} from "@/components/ui/story-helpers";
import { Toaster } from "@/components/ui/sonner";
import { isLocale, type Locale } from "@/i18n/locales";
import type { ActionToast } from "@/toasts/toast";
import { newBookingHref } from "../sections";
import { cancelAppointment, confirmAppointment } from "./actions";
import type { TodayData } from "./load";
import { longNames, stories, todayView } from "./story-today";
import { TodayScreen } from "./today-screen";

const dictionaries = { uk, ru, en };

const localeOf = (value: unknown): Locale => (isLocale(value) ? value : "uk");

const textsOf = (locale: unknown) =>
  dictionaries[localeOf(locale)].MasterCabinet;

const plain = (message: string) => message.replace(/<\/?\w+>/g, "");

// A row stretches its cells, so the text's own line boxes show whether it wrapped.
const lineCount = (el: HTMLElement) => {
  const range = document.createRange();
  range.selectNodeContents(el);
  return new Set([...range.getClientRects()].map((rect) => rect.top)).size;
};

const counter = (canvas: HTMLElement, label: string) =>
  within(canvas).getByText(label, { selector: "dt" }).parentElement!;

const meta = {
  title: "MasterCabinet/TodayScreen",
  component: TodayScreen,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
    data: stories.full,
  },
  globals: { viewport: { value: "mobile360" } },
  args: {
    view: todayView(stories.full, "uk"),
  },
  render: (args, { globals, parameters }) => (
    <div className="p-4">
      <TodayScreen
        {...args}
        view={todayView(parameters.data as TodayData, localeOf(globals.locale))}
      />
    </div>
  ),
} satisfies Meta<typeof TodayScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Full: Story = {
  play: async ({ canvas, canvasElement, globals }) => {
    const t = textsOf(globals.locale);
    const view = todayView(stories.full, localeOf(globals.locale));
    await expect(
      canvas.getByRole("heading", { level: 1, name: t.sections.today }),
    ).toBeVisible();
    await expect(canvas.getByText(view.date)).toBeVisible();
    await expect(
      counter(canvasElement, t.today.counters.today),
    ).toHaveTextContent("4");
    await expect(
      counter(canvasElement, t.today.counters.tomorrow),
    ).toHaveTextContent("2");
    await expect(
      counter(canvasElement, t.today.counters.awaiting),
    ).toHaveTextContent("1");

    const queue = canvas.getByRole("region", { name: t.today.awaitingTitle });
    await expect(within(queue).getByText("Олена Кравець")).toBeVisible();
    await expect(queue).toHaveTextContent(
      t.today.answerBy.split("{time}")[0].trim(),
    );
    await expect(queue).toHaveTextContent(view.awaiting[0].answerBy.time);
    await expect(
      within(queue).getByRole("button", { name: t.today.confirm }),
    ).toBeEnabled();
    await expect(
      within(queue).getByRole("button", { name: t.today.decline.open }),
    ).toBeEnabled();
    const subject = `Олена Кравець ${view.awaiting[0].service}`;
    for (const name of [t.today.confirm, t.today.decline.open]) {
      await expect(
        within(queue).getByRole("button", { name }),
      ).toHaveAccessibleDescription(expect.stringContaining(subject));
    }

    const todayFeed = canvas.getByRole("region", { name: t.today.todayTitle });
    await expect(within(todayFeed).getAllByRole("listitem")).toHaveLength(5);
    await expect(within(todayFeed).getByText(t.today.badges.now)).toBeVisible();
    await expect(
      within(todayFeed).getByText(t.today.badges.completed),
    ).toBeVisible();
    await expect(
      within(todayFeed).getByText(t.today.badges.noShow),
    ).toBeVisible();
    await expect(
      within(todayFeed).getByText(`${t.today.block} · Обід`),
    ).toBeVisible();

    const tomorrowFeed = canvas.getByRole("region", {
      name: t.today.tomorrowTitle,
    });
    await expect(
      within(tomorrowFeed).getByText(t.today.badges.awaitingMaster),
    ).toBeVisible();
    await expect(
      within(tomorrowFeed).getByText(t.today.badges.confirmed),
    ).toBeVisible();
    await expect(within(todayFeed).queryByRole("link")).toBeNull();
    await expect(within(tomorrowFeed).queryByRole("link")).toBeNull();
    await expect(overflowsX(document.documentElement)).toBe(false);
  },
};

export const FullRussian: Story = { ...Full, globals: { locale: "ru" } };

export const FullEnglish: Story = { ...Full, globals: { locale: "en" } };

export const QueueOnly: Story = {
  parameters: { data: stories.queueOnly },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = textsOf(globals.locale);
    await expect(
      canvas.getByRole("region", { name: t.today.awaitingTitle }),
    ).toBeVisible();
    await expect(
      counter(canvasElement, t.today.counters.awaiting),
    ).toHaveTextContent("1");
    await expect(
      counter(canvasElement, t.today.counters.today),
    ).toHaveTextContent("0");
    for (const name of [t.today.todayTitle, t.today.tomorrowTitle]) {
      const feed = canvas.getByRole("region", { name });
      await expect(feed).toHaveTextContent(t.today.nothingPlanned);
      await expect(within(feed).queryByRole("list")).toBeNull();
    }
    await expect(
      canvas.queryByRole("heading", { name: plain(t.today.empty.title) }),
    ).toBeNull();
  },
};

export const QueueOnlyRussian: Story = {
  ...QueueOnly,
  globals: { locale: "ru" },
};

export const QueueOnlyEnglish: Story = {
  ...QueueOnly,
  globals: { locale: "en" },
};

export const NoQueue: Story = {
  parameters: { data: stories.noQueue },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = textsOf(globals.locale);
    await expect(
      canvas.queryByRole("heading", { name: t.today.awaitingTitle }),
    ).toBeNull();
    await expect(
      counter(canvasElement, t.today.counters.awaiting),
    ).toHaveTextContent("0");
    const tomorrowFeed = canvas.getByRole("region", {
      name: t.today.tomorrowTitle,
    });
    await expect(within(tomorrowFeed).getByText(t.today.allDay)).toBeVisible();
    await expect(within(tomorrowFeed).getByText(t.today.block)).toBeVisible();
  },
};

export const NoQueueRussian: Story = { ...NoQueue, globals: { locale: "ru" } };

export const NoQueueEnglish: Story = { ...NoQueue, globals: { locale: "en" } };

export const Empty: Story = {
  parameters: { data: stories.empty },
  play: async ({ canvas, globals }) => {
    const t = textsOf(globals.locale);
    await expect(
      canvas.getByRole("heading", {
        level: 2,
        name: plain(t.today.empty.title),
      }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: t.add.booking }),
    ).toHaveAttribute("href", newBookingHref);
    await expect(
      canvas.queryByRole("region", { name: t.today.todayTitle }),
    ).toBeNull();
    await expect(
      canvas.queryByRole("region", { name: t.today.awaitingTitle }),
    ).toBeNull();
  },
};

export const EmptyRussian: Story = { ...Empty, globals: { locale: "ru" } };

export const EmptyEnglish: Story = { ...Empty, globals: { locale: "en" } };

export const LongNames: Story = {
  parameters: { data: stories.longNames },
  globals: { locale: "ru" },
  play: async ({ canvas, globals }) => {
    const t = textsOf(globals.locale);
    const queue = canvas.getByRole("region", { name: t.today.awaitingTitle });
    const todayFeed = canvas.getByRole("region", { name: t.today.todayTitle });
    await expect(within(queue).getByText(longNames.client)).toBeVisible();
    await expect(within(todayFeed).getByText(longNames.client)).toBeVisible();
    await expect(
      within(todayFeed).getByText(
        new RegExp(longNames.service[localeOf(globals.locale)]),
      ),
    ).toBeVisible();
    const time = within(todayFeed).getByText(
      todayView(stories.longNames, localeOf(globals.locale)).today[0].time!,
    );
    await expect(lineCount(time)).toBe(1);
    await expect(overflowsX(queue)).toBe(false);
    await expect(overflowsX(todayFeed)).toBe(false);
    await expect(overflowsX(document.documentElement)).toBe(false);
  },
};

export const LongNamesUkrainian: Story = {
  ...LongNames,
  globals: { locale: "uk" },
};

export const LongNamesEnglish: Story = {
  ...LongNames,
  globals: { locale: "en" },
};

export const Offline: Story = {
  beforeEach: () => {
    stubOnLine(false);
    return restoreOnLine;
  },
  play: async ({ canvas, globals }) => {
    const t = textsOf(globals.locale);
    const queue = canvas.getByRole("region", { name: t.today.awaitingTitle });
    await expect(
      within(queue).getByRole("button", { name: t.today.confirm }),
    ).toBeDisabled();
    await expect(
      within(queue).getByRole("button", { name: t.today.decline.open }),
    ).toBeDisabled();
  },
};

export const OfflineRussian: Story = { ...Offline, globals: { locale: "ru" } };

export const OfflineEnglish: Story = { ...Offline, globals: { locale: "en" } };

export const Confirming: Story = {
  beforeEach: () => {
    const settle = { now: () => {} };
    mocked(confirmAppointment).mockImplementation(
      () => new Promise((resolve) => (settle.now = () => resolve({}))),
    );
    // React holds every later transition on the page until a pending action settles.
    return () => settle.now();
  },
  play: async ({ canvas, userEvent, globals }) => {
    const t = textsOf(globals.locale);
    const queue = canvas.getByRole("region", { name: t.today.awaitingTitle });
    const confirm = within(queue).getByRole("button", {
      name: t.today.confirm,
    });
    await userEvent.click(confirm);
    await waitFor(() => expect(confirm).toHaveAttribute("aria-busy", "true"));
    await expect(confirm).toHaveAttribute("aria-disabled", "true");
    await expect(
      within(queue).getByRole("button", { name: t.today.decline.open }),
    ).toBeDisabled();

    const submits = { count: 0 };
    const form = confirm.closest("form")!;
    const count = () => submits.count++;
    form.addEventListener("submit", count);
    fireEvent.click(confirm);
    form.removeEventListener("submit", count);
    await expect(submits.count).toBe(0);

    await expect(confirmAppointment).toHaveBeenCalledTimes(1);
    const data = mocked(confirmAppointment).mock.calls[0][1];
    await expect(data.get("appointmentId")).toBe("a5");
  },
};

export const ConfirmingRussian: Story = {
  ...Confirming,
  globals: { locale: "ru" },
};

export const ConfirmingEnglish: Story = {
  ...Confirming,
  globals: { locale: "en" },
};

// A decision refreshes the page, which drops the decided card in the same commit as the action's result.
const decided = { drop: () => {} };

function DecidedQueue({ locale }: { locale: Locale }) {
  const [data, setData] = useState(stories.full);
  useEffect(() => {
    decided.drop = () => setData((before) => ({ ...before, awaiting: [] }));
  }, []);
  return (
    <div className="p-4">
      <Toaster />
      <TodayScreen view={todayView(data, locale)} />
    </div>
  );
}

const dropOnResolve = (result: ActionToast) => async () => {
  decided.drop();
  return { toast: result };
};

const decidedQueue: Story["render"] = (_args, { globals }) => (
  <DecidedQueue locale={localeOf(globals.locale)} />
);

export const ConfirmedAndGone: Story = {
  render: decidedQueue,
  beforeEach: () => {
    mocked(confirmAppointment).mockImplementation(
      dropOnResolve({ type: "success", key: "appointmentConfirmed" }),
    );
    return () => toast.dismiss();
  },
  play: async ({ canvas, userEvent, globals }) => {
    const texts = dictionaries[localeOf(globals.locale)];
    const queue = canvas.getByRole("region", {
      name: texts.MasterCabinet.today.awaitingTitle,
    });
    await userEvent.click(
      within(queue).getByRole("button", {
        name: texts.MasterCabinet.today.confirm,
      }),
    );
    await waitFor(() =>
      expect(
        canvas.queryByRole("region", {
          name: texts.MasterCabinet.today.awaitingTitle,
        }),
      ).toBeNull(),
    );
    await waitFor(() =>
      expect(screen.getByText(texts.Toasts.appointmentConfirmed)).toBeVisible(),
    );
  },
};

export const ConfirmedAndGoneEnglish: Story = {
  ...ConfirmedAndGone,
  globals: { locale: "en" },
};

export const ExpiredAndGone: Story = {
  render: decidedQueue,
  beforeEach: () => {
    mocked(confirmAppointment).mockImplementation(
      dropOnResolve({ type: "error", key: "decisionExpired" }),
    );
    return () => toast.dismiss();
  },
  play: async ({ canvas, userEvent, globals }) => {
    const texts = dictionaries[localeOf(globals.locale)];
    await userEvent.click(
      canvas.getByRole("button", { name: texts.MasterCabinet.today.confirm }),
    );
    await waitFor(() =>
      expect(screen.getByText(texts.Toasts.decisionExpired)).toBeVisible(),
    );
    await expect(
      screen.queryByText(texts.Toasts.appointmentConfirmed),
    ).toBeNull();
  },
};

export const DeclinedAndGone: Story = {
  render: decidedQueue,
  beforeEach: () => {
    mocked(cancelAppointment).mockImplementation(
      dropOnResolve({ type: "success", key: "appointmentDeclined" }),
    );
    return () => toast.dismiss();
  },
  play: async ({ canvas, userEvent, globals }) => {
    const texts = dictionaries[localeOf(globals.locale)];
    const decline = texts.MasterCabinet.today.decline;
    await userEvent.click(canvas.getByRole("button", { name: decline.open }));
    const dialog = await screen.findByRole("dialog", { name: decline.title });
    await userEvent.click(
      within(dialog).getByRole("button", { name: decline.submit }),
    );
    await waitFor(() =>
      expect(screen.getByText(texts.Toasts.appointmentDeclined)).toBeVisible(),
    );
    await expect(screen.queryByRole("dialog")).toBeNull();
  },
};

export const DeclinedAndGoneRussian: Story = {
  ...DeclinedAndGone,
  globals: { locale: "ru" },
};
