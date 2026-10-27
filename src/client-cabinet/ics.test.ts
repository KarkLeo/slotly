import { describe, expect, it } from "vitest";
import { calendarFile } from "./ics";

const event = {
  id: "a1",
  startsAt: "2030-01-14T10:00:00+00:00",
  endsAt: "2030-01-14T11:30:00+00:00",
  title: "Манікюр, Олена Мельник",
  location: null,
  url: "https://slotly.test/app/bookings/a1",
};

describe("calendarFile", () => {
  it("describes the booking in UTC with CRLF line ends", () => {
    const file = calendarFile(event, new Date("2030-01-01T08:00:00Z"));
    expect(file.split("\r\n")).toEqual([
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Slotly//Booking//EN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:a1@slotly",
      "DTSTAMP:20300101T080000Z",
      "DTSTART:20300114T100000Z",
      "DTEND:20300114T113000Z",
      "SUMMARY:Манікюр\\, Олена Мельник",
      "DESCRIPTION:https://slotly.test/app/bookings/a1",
      "URL:https://slotly.test/app/bookings/a1",
      "END:VEVENT",
      "END:VCALENDAR",
      "",
    ]);
  });

  it("escapes the location and folds long lines at 75 bytes", () => {
    const file = calendarFile(
      {
        ...event,
        location: "вул. Хрещатик, 1; під’їзд 2\nдомофон 15 ".repeat(2),
      },
      new Date(),
    );
    const location = file
      .slice(file.indexOf("LOCATION:"))
      .split("\r\nDESCRIPTION")[0];
    const lines = location.split("\r\n");
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines)
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(
      lines.map((line, i) => (i === 0 ? line : line.slice(1))).join(""),
    ).toBe(
      "LOCATION:вул. Хрещатик\\, 1\\; під’їзд 2\\nдомофон 15 вул. Хрещатик\\, 1\\; під’їзд 2\\nдомофон 15 ",
    );
  });
});
