import "server-only";
import { createClient } from "@/db/server";
import { type MyBooking, type MyBookingRow, toMyBooking } from "./booking";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadMyBookings(): Promise<MyBooking[]> {
  const { data, error } = await (await createClient()).rpc("get_my_bookings");
  if (error) throw error;
  return (data as MyBookingRow[]).map(toMyBooking);
}

export async function loadMyBooking(id: string): Promise<MyBooking | null> {
  if (!uuid.test(id)) return null;
  const { data, error } = await (
    await createClient()
  )
    .rpc("get_my_bookings")
    .eq("appointment_id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toMyBooking(data as MyBookingRow) : null;
}

export async function isMaster(userId: string): Promise<boolean> {
  const { data, error } = await (
    await createClient()
  )
    .from("masters")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}
