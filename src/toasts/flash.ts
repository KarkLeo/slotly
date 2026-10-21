import "server-only";
import { cookies } from "next/headers";
import { type ActionToast, encodeFlash, flashCookie } from "./toast";

// Read and cleared by FlashToast in the browser, so it cannot be HttpOnly.
export async function setFlash(toast: ActionToast) {
  (await cookies()).set(flashCookie, encodeFlash(toast), {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
  });
}
