import { unstable_rethrow } from "next/navigation";
import type { ActionToast } from "./toast";

// Wraps an action for useActionState so a thrown error or a failed request becomes a toast instead of the error page.
export function withUnexpectedToast<S extends { toast?: ActionToast }>(
  action: (state: S, formData: FormData) => Promise<S>,
  fallback: (state: S, formData: FormData) => S = (state) => state,
) {
  return async (state: S, formData: FormData): Promise<S> => {
    try {
      return await action(state, formData);
    } catch (error) {
      unstable_rethrow(error);
      return {
        ...fallback(state, formData),
        toast: { type: "error", key: "unexpected" },
      };
    }
  };
}
