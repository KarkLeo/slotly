import {
  unstable_isUnrecognizedActionError,
  unstable_rethrow,
} from "next/navigation";
import type { ActionToast } from "./toast";

// Lets Next.js control flow through and turns anything else into the unexpected toast.
export function unexpectedToast(error: unknown): ActionToast {
  unstable_rethrow(error);
  // A tab opened before a deploy calls actions the new server no longer knows; only a reload fixes it.
  if (unstable_isUnrecognizedActionError(error)) window.location.reload();
  console.error(error);
  return { type: "error", key: "unexpected" };
}

// Wraps an action for useActionState so a thrown error or a failed request becomes a toast instead of the error page.
export function withUnexpectedToast<S extends { toast?: ActionToast }>(
  action: (state: S, formData: FormData) => Promise<S>,
  fallback: (state: S, formData: FormData) => S = (state) => state,
) {
  return async (state: S, formData: FormData): Promise<S> => {
    try {
      return await action(state, formData);
    } catch (error) {
      return { ...fallback(state, formData), toast: unexpectedToast(error) };
    }
  };
}
