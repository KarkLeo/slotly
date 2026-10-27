import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { signInAs } from "@/auth/otp";
import { createClient } from "@/db/server";
import { bookingPath, verifyLinkToken } from "@/notifications/link-token";
import { setFlash } from "@/toasts/flash";

// A link from a notification signs its recipient in and opens the booking.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const link = token ? await verifyLinkToken(token) : null;

  if (link) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const current = data?.claims.sub;
    if (current === link.userId)
      redirect(bookingPath(link.audience, link.appointmentId));
    if (current) await supabase.auth.signOut({ scope: "local" });
    const error = await signInAs(supabase, link.userId);
    if (!error) {
      await setFlash({ type: "success", key: "signedIn" });
      redirect(bookingPath(link.audience, link.appointmentId));
    }
  }

  await setFlash({ type: "error", key: "linkExpired" });
  redirect("/login");
}
