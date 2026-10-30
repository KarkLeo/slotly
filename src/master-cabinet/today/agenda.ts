import type { Database } from "@/db/types";
import type { LocalizedText } from "@/landing/localize";

type Functions = Database["public"]["Functions"];

// Generated types lose the nullability of set-returning function columns.
export type AgendaRow = Omit<
  Functions["get_master_agenda"]["Returns"][number],
  "hold_until" | "client_name" | "service_name" | "note"
> & {
  hold_until: string | null;
  client_name: string | null;
  service_name: LocalizedText | null;
  note: string | null;
};

export type AwaitingRow = Omit<
  Functions["get_awaiting_decisions"]["Returns"][number],
  "service_name"
> & { service_name: LocalizedText };

export type AgendaItem =
  | {
      kind: "appointment";
      id: string;
      day: string;
      startsAt: string;
      endsAt: string;
      status: "pending" | "confirmed" | "completed" | "no_show";
      holdUntil: string | null;
      clientName: string;
      serviceName: LocalizedText;
    }
  | {
      kind: "block";
      id: string;
      day: string;
      startsAt: string;
      endsAt: string;
      allDay: boolean;
      note: string | null;
    };

export type AwaitingDecision = {
  id: string;
  startsAt: string;
  endsAt: string;
  holdUntil: string;
  clientName: string;
  serviceName: LocalizedText;
};

export function toAgendaItem(row: AgendaRow): AgendaItem {
  if (row.kind === "block") {
    return {
      kind: "block",
      id: row.id,
      day: row.day,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      allDay: row.all_day,
      note: row.note,
    };
  }
  return {
    kind: "appointment",
    id: row.id,
    day: row.day,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status as Extract<
      AgendaItem,
      { kind: "appointment" }
    >["status"],
    holdUntil: row.hold_until,
    clientName: row.client_name ?? "",
    serviceName: row.service_name ?? {},
  };
}

export function toAwaitingDecision(row: AwaitingRow): AwaitingDecision {
  return {
    id: row.appointment_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    holdUntil: row.hold_until,
    clientName: row.client_name,
    serviceName: row.service_name,
  };
}
