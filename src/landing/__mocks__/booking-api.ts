import { fn } from "storybook/test";
import { addDays, localDate } from "@/booking/dates";
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

// Every date is free except Sundays and a today whose times have all passed; each free date offers the times above
// in Kyiv, never in the past. A day in another zone gathers the Kyiv times that fall on it.
function slotsOf(day: string, timeZone: string): string[] {
  return [addDays(day, -1), day, addDays(day, 1)]
    .filter((date) => new Date(`${date}T12:00:00Z`).getUTCDay() !== 0)
    .flatMap((date) => times.map((time) => kyiv(date, time)))
    .filter(
      (slot) =>
        localDate(new Date(slot), timeZone) === day &&
        new Date(slot) > new Date(),
    );
}

export const fetchAvailableDays = fn<typeof api.fetchAvailableDays>(
  async (_serviceId, from, to, timeZone) => {
    const days: string[] = [];
    for (let day = from; day <= to; day = addDays(day, 1)) {
      if (slotsOf(day, timeZone).length > 0) days.push(day);
    }
    return days;
  },
);

export const fetchAvailableSlots = fn<typeof api.fetchAvailableSlots>(
  async (_serviceId, day, timeZone) => slotsOf(day, timeZone),
);
