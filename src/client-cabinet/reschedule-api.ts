import { createClient } from "@/db/browser";

export async function fetchRescheduleDays(
  serviceId: string,
  appointmentId: string,
  from: string,
  to: string,
): Promise<string[]> {
  const { data, error } = await createClient().rpc("get_available_days", {
    service_id: serviceId,
    day_from: from,
    day_to: to,
    ignore_appointment_id: appointmentId,
  });
  if (error) throw error;
  return data;
}

export async function fetchRescheduleSlots(
  serviceId: string,
  appointmentId: string,
  day: string,
): Promise<string[]> {
  const { data, error } = await createClient().rpc("get_available_slots", {
    service_id: serviceId,
    day_from: day,
    day_to: day,
    ignore_appointment_id: appointmentId,
  });
  if (error) throw error;
  return data;
}
