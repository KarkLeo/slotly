import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { isLocale, type Locale } from "@/i18n/locales";
import { BookingsList } from "./bookings-list";
import { stories, view } from "./story-bookings";

const dictionaries = { uk, ru, en };

const localeOf = (value: unknown): Locale => (isLocale(value) ? value : "uk");

const plain = (message: string) => message.replace(/<\/?\w+>/g, "");

const upcoming = [stories.late, stories.confirmed, stories.awaitingMaster];
const history = [stories.completed, stories.cancelled];

const meta = {
  title: "ClientCabinet/BookingsList",
  component: BookingsList,
  parameters: { layout: "fullscreen" },
  args: { tab: "upcoming", bookings: [] },
  render: ({ tab }, { globals, parameters }) => {
    const locale = localeOf(globals.locale);
    const source = parameters.empty
      ? []
      : tab === "upcoming"
        ? upcoming
        : history;
    return (
      <BookingsList
        tab={tab}
        bookings={source.map((booking) => view(booking, locale))}
      />
    );
  },
} satisfies Meta<typeof BookingsList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Upcoming: Story = {
  play: async ({ canvas, globals }) => {
    const t = dictionaries[localeOf(globals.locale)].MyBookings;
    await expect(
      canvas.getByRole("heading", { level: 1, name: plain(t.title) }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: t.upcoming }),
    ).toHaveAttribute("aria-current", "page");
    const items = canvas.getAllByRole("listitem");
    await expect(items).toHaveLength(3);
    await expect(items[0]).toHaveTextContent(t.lateHint);
    await expect(items[1]).toHaveTextContent(t.confirmed);
    await expect(items[2]).toHaveTextContent(t.awaitingMaster);
    await expect(
      canvas.getAllByRole("link", { name: /Олена/ })[0],
    ).toHaveAttribute("href", "/app/bookings/b3");
  },
};

export const Russian: Story = { ...Upcoming, globals: { locale: "ru" } };

export const English: Story = { ...Upcoming, globals: { locale: "en" } };

export const History: Story = {
  args: { tab: "history" },
  play: async ({ canvas, globals }) => {
    const t = dictionaries[localeOf(globals.locale)].MyBookings;
    await expect(canvas.getByRole("link", { name: t.history })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const items = canvas.getAllByRole("listitem");
    await expect(items[0]).toHaveTextContent(t.completed);
    await expect(items[1]).toHaveTextContent(t.cancelled);
  },
};

export const Empty: Story = {
  parameters: { empty: true },
  play: async ({ canvas, globals }) => {
    const t = dictionaries[localeOf(globals.locale)].MyBookings;
    await expect(
      canvas.getByRole("heading", { level: 2, name: plain(t.emptyTitle) }),
    ).toBeVisible();
    await expect(canvas.queryByRole("list")).toBeNull();
  },
};

export const EmptyHistory: Story = {
  args: { tab: "history" },
  parameters: { empty: true },
  play: async ({ canvas, globals }) => {
    const t = dictionaries[localeOf(globals.locale)].MyBookings;
    await expect(canvas.getByText(t.emptyHistory)).toBeVisible();
  },
};
