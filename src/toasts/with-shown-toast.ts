import type { ActionToast } from "./toast";
import { withUnexpectedToast } from "./with-unexpected-toast";

// Shows the toast as the action resolves, so it survives the component unmounting in the same commit.
export function withShownToast<S extends { toast?: ActionToast }>(
  action: (state: S, formData: FormData) => Promise<S>,
  show: (toast: ActionToast) => void,
) {
  const guarded = withUnexpectedToast(action);
  return async (state: S, formData: FormData): Promise<S> => {
    const next = await guarded(state, formData);
    if (next.toast) show(next.toast);
    return next;
  };
}
