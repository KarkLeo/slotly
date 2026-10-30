import "server-only";
import { addDays, localDate } from "@/booking/dates";
import { createClient } from "@/db/server";
import type { Locale } from "@/i18n/locales";
import {
  type AgendaItem,
  type AgendaRow,
  type AwaitingDecision,
  type AwaitingRow,
  toAgendaItem,
  toAwaitingDecision,
} from "./agenda";

export type TodayData = {
  timeZone: string;
  primaryLocale: Locale;
  today: string;
  agenda: AgendaItem[];
  awaiting: AwaitingDecision[];
};

export async function loadToday(
  masterId: string,
  now: Date,
): Promise<TodayData> {
  const supabase = await createClient();
  const { data: master, error: masterError } = await supabase
    .from("masters")
    .select("timezone, primary_locale")
    .eq("id", masterId)
    .maybeSingle();
  if (masterError) throw masterError;
  if (!master) throw new Error("Master not found");

  const today = localDate(now, master.timezone);
  const [agenda, awaiting] = await Promise.all([
    supabase.rpc("get_master_agenda", {
      from_date: today,
      to_date: addDays(today, 1),
    }),
    supabase.rpc("get_awaiting_decisions"),
  ]);
  if (agenda.error) throw agenda.error;
  if (awaiting.error) throw awaiting.error;

  return {
    timeZone: master.timezone,
    primaryLocale: master.primary_locale,
    today,
    agenda: (agenda.data as AgendaRow[]).map(toAgendaItem),
    awaiting: (awaiting.data as AwaitingRow[]).map(toAwaitingDecision),
  };
}
