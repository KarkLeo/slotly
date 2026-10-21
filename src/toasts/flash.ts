import "server-only";
import { cookies } from "next/headers";
import { type ActionToast, encodeFlash, flashCookie } from "./toast";

// Not HttpOnly: FlashToast reads it in the browser, and only on a URL change, so redirect to a different URL.
export async function setFlash(toast: ActionToast) {
  (await cookies()).set(flashCookie, encodeFlash(toast), {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
  });
}
