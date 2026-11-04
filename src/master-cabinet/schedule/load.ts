import "server-only";
import { createClient } from "@/db/server";
import { localDate } from "@/booking/dates";
import { type Interval, parseHours } from "./hours";
import type { ScheduleData } from "./view";

function intervals(literal: unknown): Interval[] {
  const parsed = parseHours(literal as string);
  if (!parsed) throw new Error(`Unparsable hours: ${String(literal)}`);
  return parsed;
}

export async function loadSchedule(
  masterId: string,
  now: Date,
): Promise<ScheduleData> {
  const supabase = await createClient();
  const master = await supabase
    .from("masters")
    .select(
      "timezone, slot_step_minutes, min_notice_minutes, horizon_days, cancel_deadline_minutes, auto_confirm",
    )
    .eq("id", masterId)
    .maybeSingle();
  if (master.error) throw master.error;
  if (!master.data) throw new Error("Master not found");

  const today = localDate(now, master.data.timezone);
  const [template, exceptions, appointments] = await Promise.all([
    supabase.from("work_template").select("weekday, hours"),
    supabase
      .from("schedule_exceptions")
      .select("day, hours")
      .gte("day", today)
      .order("day"),
    supabase.rpc("get_upcoming_appointments"),
  ]);
  if (template.error) throw template.error;
  if (exceptions.error) throw exceptions.error;
  if (appointments.error) throw appointments.error;

  return {
    timeZone: master.data.timezone,
    template: Object.fromEntries(
      [1, 2, 3, 4, 5, 6, 7].map((weekday) => {
        const row = template.data.find((r) => r.weekday === weekday);
        return [weekday, row ? intervals(row.hours) : []];
      }),
    ),
    exceptionDays: exceptions.data.map((row) => ({
      day: row.day,
      hours: intervals(row.hours),
    })),
    appointments: appointments.data.map((row) => ({
      id: row.id,
      clientName: (row.client_name as string | null) ?? null,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
    })),
    params: {
      step: master.data.slot_step_minutes,
      notice: master.data.min_notice_minutes,
      horizon: master.data.horizon_days,
      deadline: master.data.cancel_deadline_minutes,
    },
    autoConfirm: master.data.auto_confirm,
  };
}
