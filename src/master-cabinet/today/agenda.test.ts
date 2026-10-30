import { describe, expect, it } from "vitest";
import { type AgendaRow, toAgendaItem, toAwaitingDecision } from "./agenda";

const base: AgendaRow = {
  kind: "appointment",
  id: "a1",
  day: "2026-10-30",
  starts_at: "2026-10-30T09:00:00Z",
  ends_at: "2026-10-30T10:00:00Z",
  all_day: false,
  status: "confirmed",
  hold_until: null,
  client_name: "Olena",
  service_name: { uk: "Манікюр" },
  note: null,
};

describe("toAgendaItem", () => {
  it("maps a block row with allDay", () => {
    expect(
      toAgendaItem({
        ...base,
        kind: "block",
        all_day: true,
        status: null,
        client_name: null,
        service_name: null,
        note: "Vacation",
      }),
    ).toEqual({
      kind: "block",
      id: "a1",
      day: "2026-10-30",
      startsAt: "2026-10-30T09:00:00Z",
      endsAt: "2026-10-30T10:00:00Z",
      allDay: true,
      note: "Vacation",
    });
  });

  it("maps an appointment row and passes no_show through", () => {
    expect(toAgendaItem({ ...base, status: "no_show" })).toMatchObject({
      kind: "appointment",
      status: "no_show",
      clientName: "Olena",
      serviceName: { uk: "Манікюр" },
      holdUntil: null,
    });
  });
});

describe("toAwaitingDecision", () => {
  it("maps the row", () => {
    expect(
      toAwaitingDecision({
        appointment_id: "p1",
        starts_at: "2026-10-31T09:00:00Z",
        ends_at: "2026-10-31T10:00:00Z",
        hold_until: "2026-10-30T15:00:00Z",
        client_name: "Olena",
        service_name: { uk: "Манікюр" },
      }),
    ).toEqual({
      id: "p1",
      startsAt: "2026-10-31T09:00:00Z",
      endsAt: "2026-10-31T10:00:00Z",
      holdUntil: "2026-10-30T15:00:00Z",
      clientName: "Olena",
      serviceName: { uk: "Манікюр" },
    });
  });
});
