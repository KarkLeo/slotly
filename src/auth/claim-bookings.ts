import "server-only";
import type { createClient } from "@/db/server";
import type { ActionToast } from "@/toasts/toast";

// The link in a booking email confirms that booking, from whichever device opens it.
export async function claimBooking(
  supabase: Awaited<ReturnType<typeof createClient>>,
  appointmentId: string,
): Promise<ActionToast> {
  const { data, error } = await supabase.rpc("claim_bookings", {
    appointment_ids: [appointmentId],
  });
  if (error) console.error(error);
  const booking = data?.[0];
  if (!booking) return { type: "error", key: "bookingExpired" };
  return {
    type: "success",
    key:
      booking.status === "confirmed" ? "bookingConfirmed" : "bookingRequested",
  };
}
