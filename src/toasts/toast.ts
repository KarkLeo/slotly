import type messages from "../../messages/en.json";

export type ToastKey = keyof typeof messages.Toasts;
export type ActionToast = { type: "success" | "error"; key: ToastKey };

export const flashCookie = "slotly-flash";

const toastKeys = {
  codeSent: true,
  signedIn: true,
  signedOut: true,
  linkExpired: true,
  rateLimited: true,
  unexpected: true,
  decisionFailed: true,
  bookingConfirmed: true,
  bookingRequested: true,
  bookingExpired: true,
  bookingCancelled: true,
  bookingRescheduled: true,
  rescheduleRequested: true,
  changeClosed: true,
  bookingNotActive: true,
  rescheduleClosed: true,
} satisfies Record<ToastKey, true>;

export function encodeFlash(toast: ActionToast): string {
  return `${toast.type}:${toast.key}`;
}

export function decodeFlash(value: string | undefined): ActionToast | null {
  const [type, key, ...rest] = (value ?? "").split(":");
  if (rest.length > 0 || (type !== "success" && type !== "error")) return null;
  if (!Object.hasOwn(toastKeys, key)) return null;
  return { type, key: key as ToastKey };
}

export function readFlashCookie(cookies: string): ActionToast | null {
  const prefix = `${flashCookie}=`;
  const raw = cookies
    .split("; ")
    .find((entry) => entry.startsWith(prefix))
    ?.slice(prefix.length);
  if (raw === undefined) return null;
  try {
    return decodeFlash(decodeURIComponent(raw));
  } catch {
    return null;
  }
}
