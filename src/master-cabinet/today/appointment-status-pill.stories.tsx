import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import en from "../../../messages/en.json";
import ru from "../../../messages/ru.json";
import uk from "../../../messages/uk.json";
import { isLocale, type Locale } from "@/i18n/locales";
import { AppointmentStatusPill } from "./appointment-status-pill";
import type { AppointmentStatus } from "./view";

const dictionaries = { uk, ru, en };

const statuses: AppointmentStatus[] = [
  "awaitingMaster",
  "confirmed",
  "now",
  "completed",
  "noShow",
];

const meta = {
  title: "MasterCabinet/AppointmentStatusPill",
  component: AppointmentStatusPill,
  globals: { viewport: { value: "mobile360" } },
  args: { status: "confirmed" },
} satisfies Meta<typeof AppointmentStatusPill>;

export default meta;

type Story = StoryObj<typeof meta>;

// Pills sit on the feed's card, so the run checks their contrast against it.
export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 bg-card p-4">
      {statuses.map((status) => (
        <AppointmentStatusPill key={status} status={status} />
      ))}
    </div>
  ),
  play: async ({ canvas, globals }) => {
    const locale: Locale = isLocale(globals.locale) ? globals.locale : "uk";
    const labels = dictionaries[locale].MasterCabinet.today.badges;
    for (const status of statuses) {
      await expect(canvas.getByText(labels[status])).toBeVisible();
    }
  },
};

export const AllStatusesRussian: Story = {
  ...AllStatuses,
  globals: { locale: "ru" },
};

export const AllStatusesEnglish: Story = {
  ...AllStatuses,
  globals: { locale: "en" },
};
