import { fn } from "storybook/test";
import { addDays } from "@/booking/dates";
import type * as api from "../booking-api";

const times = [
  "09:00",
  "09:30",
  "10:30",
  "12:00",
  "13:30",
  "16:00",
  "17:00",
  "18:00",
];

// Kyiv wall-clock time of a date as an ISO instant, so groups and labels do not shift with DST.
function kyiv(day: string, time: string): string {
  const noon = new Date(`${day}T12:00:00Z`);
  const offset =
    Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Kyiv",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(noon),
    ) - 12;
  const [hours, minutes] = time.split(":").map(Number);
  const instant = new Date(`${day}T00:00:00Z`);
  instant.setUTCHours(hours - offset, minutes);
  return instant.toISOString();
}

// Every date is free except Sundays; each free date offers the times above, never in the past.
export const fetchAvailableDays = fn<typeof api.fetchAvailableDays>(
  async (_serviceId, from, to) => {
    const days: string[] = [];
    for (let day = from; day <= to; day = addDays(day, 1)) {
      if (new Date(`${day}T12:00:00Z`).getUTCDay() !== 0) days.push(day);
    }
    return days;
  },
);

export const fetchAvailableSlots = fn<typeof api.fetchAvailableSlots>(
  async (_serviceId, day) =>
    times
      .map((time) => kyiv(day, time))
      .filter((slot) => new Date(slot) > new Date()),
);
