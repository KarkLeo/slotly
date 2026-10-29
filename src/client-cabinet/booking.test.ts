import { describe, expect, it } from "vitest";
import {
  canChange,
  type MyBooking,
  type MyBookingRow,
  splitBookings,
  toMyBooking,
} from "./booking";
import { toBookingView } from "./view";

const row: MyBookingRow = {
  appointment_id: "a1",
  status: "confirmed",
  starts_at: "2030-01-14T10:00:00+00:00",
  ends_at: "2030-01-14T11:30:00+00:00",
  hold_until: null,
  change_until: "2030-01-13T22:00:00+00:00",
  can_reschedule: true,
  master_name: "Олена Мельник",
  master_slug: "olena",
  time_zone: "Europe/Kyiv",
  auto_confirm: true,
  horizon_days: 30,
  primary_locale: "uk",
  service_id: "s1",
  service_name: { uk: "Манікюр", en: "Manicure" },
  price_kind: "fixed",
  price: 900,
  currency: "UAH",
  format: "on_site",
  address: null,
};

const booking = toMyBooking(row);

function at(iso: string) {
  return new Date(iso);
}

function with_(changes: Partial<MyBooking>): MyBooking {
  return { ...booking, ...changes };
}

describe("toMyBooking", () => {
  it("shows a no-show as completed and takes the length from the appointment", () => {
    const mapped = toMyBooking({ ...row, status: "no_show" });
    expect(mapped.status).toBe("completed");
    expect(mapped.service.durationMinutes).toBe(90);
  });
});

describe("canChange", () => {
  it("allows changes until the deadline", () => {
    expect(canChange(booking, at("2030-01-13T22:00:00Z"))).toBe(true);
    expect(canChange(booking, at("2030-01-13T22:00:01Z"))).toBe(false);
  });

  it("never allows changes to a cancelled booking", () => {
    expect(
      canChange(with_({ status: "cancelled" }), at("2030-01-01T00:00:00Z")),
    ).toBe(false);
  });
});

describe("splitBookings", () => {
  it("keeps active bookings until they end, nearest first; history latest first", () => {
    const later = with_({
      id: "later",
      startsAt: "2030-01-20T10:00:00Z",
      endsAt: "2030-01-20T11:00:00Z",
    });
    const running = with_({
      id: "running",
      startsAt: "2030-01-10T10:00:00Z",
      endsAt: "2030-01-10T11:00:00Z",
    });
    const cancelled = with_({ id: "cancelled", status: "cancelled" });
    const done = with_({
      id: "done",
      status: "completed",
      startsAt: "2030-01-01T10:00:00Z",
      endsAt: "2030-01-01T11:00:00Z",
    });
    const result = splitBookings(
      [done, later, cancelled, running],
      at("2030-01-10T10:30:00Z"),
    );
    expect(result.upcoming.map((b) => b.id)).toEqual(["running", "later"]);
    expect(result.history.map((b) => b.id)).toEqual(["cancelled", "done"]);
  });
});

describe("toBookingView", () => {
  const now = at("2030-01-10T12:00:00Z");

  it("shows times in the master's zone and the language of the page", () => {
    const view = toBookingView(booking, "en", now);
    expect(view).toMatchObject({
      href: "/app/bookings/a1",
      status: "confirmed",
      date: "Mon, January 14",
      time: "12:00 PM–01:30 PM",
      master: { name: "Олена Мельник", initials: "ОМ", href: "/olena" },
      service: { name: "Manicure", duration: "1 hr, 30 min" },
      late: false,
      waitsUntil: null,
      canReschedule: true,
      bookAgainHref: null,
    });
    expect(view.changeUntil).toContain("12:00");
  });

  it("falls back to the master's language for the service name", () => {
    expect(toBookingView(booking, "ru", now).service.name).toBe("Манікюр");
  });

  it("marks an active booking past the deadline as late", () => {
    const view = toBookingView(booking, "uk", at("2030-01-14T08:00:00Z"));
    expect(view).toMatchObject({
      late: true,
      changeUntil: null,
      canReschedule: false,
    });
  });

  it("says until when a booking waits for the master", () => {
    const view = toBookingView(
      with_({ status: "pending", holdUntil: "2030-01-11T12:00:00Z" }),
      "uk",
      now,
    );
    expect(view.status).toBe("awaitingMaster");
    expect(view.waitsUntil).toContain("14:00");
  });

  it("offers moving only while the service can be booked", () => {
    expect(
      toBookingView(with_({ canReschedule: false }), "uk", now).canReschedule,
    ).toBe(false);
  });

  it("offers booking again after a completed booking of a bookable service", () => {
    expect(
      toBookingView(with_({ status: "completed" }), "uk", now).bookAgainHref,
    ).toBe("/olena?service=s1");
    expect(
      toBookingView(with_({ status: "cancelled" }), "uk", now).bookAgainHref,
    ).toBeNull();
  });
});
