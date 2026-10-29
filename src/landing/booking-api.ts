import { createClient } from "@/db/browser";

export async function fetchAvailableDays(
  serviceId: string,
  from: string,
  to: string,
  timeZone: string,
): Promise<string[]> {
  const { data, error } = await createClient().rpc("get_available_days", {
    service_id: serviceId,
    day_from: from,
    day_to: to,
    time_zone: timeZone,
  });
  if (error) throw error;
  return data;
}

export async function fetchAvailableSlots(
  serviceId: string,
  day: string,
  timeZone: string,
): Promise<string[]> {
  const { data, error } = await createClient().rpc("get_available_slots", {
    service_id: serviceId,
    day_from: day,
    day_to: day,
    time_zone: timeZone,
  });
  if (error) throw error;
  return data;
}
