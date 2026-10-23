import "server-only";
import type { createClient } from "@/db/server";
import type { ActionToast } from "@/toasts/toast";

// Any sign-in by email confirms the bookings made with that email, so the flash says what happened to them.
export async function claimBookings(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<ActionToast> {
  const { data, error } = await supabase.rpc("claim_bookings");
  if (error) console.error(error);
  if (!data?.length) return { type: "success", key: "signedIn" };
  return {
    type: "success",
    key: data.some((booking) => booking.status === "confirmed")
      ? "bookingConfirmed"
      : "bookingRequested",
  };
}
