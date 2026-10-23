import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { claimBooking } from "@/auth/claim-bookings";
import { safeNextPath } from "@/auth/next-path";
import { verifyOtp } from "@/auth/otp";
import { createClient } from "@/db/server";
import { setFlash } from "@/toasts/flash";

const allowedTypes = new Set<EmailOtpType>(["email", "magiclink", "signup"]);

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type && allowedTypes.has(type)) {
    const supabase = await createClient();
    const error = await verifyOtp(supabase, { token_hash: tokenHash, type });
    if (!error) {
      const booking = searchParams.get("booking");
      await setFlash(
        booking && uuid.test(booking)
          ? await claimBooking(supabase, booking)
          : { type: "success", key: "signedIn" },
      );
      redirect(safeNextPath(searchParams.get("next")));
    }
  }

  await setFlash({ type: "error", key: "linkExpired" });
  redirect("/login");
}
