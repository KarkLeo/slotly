"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { toast } from "sonner";
import type { ActionToast } from "./toast";
import { withShownToast } from "./with-shown-toast";

// For an action whose result can unmount its own component, where useActionToast's effect would never run.
export function useShownToastAction<S extends { toast?: ActionToast }>(
  action: (state: S, formData: FormData) => Promise<S>,
) {
  const t = useTranslations("Toasts");
  return useMemo(
    () => withShownToast(action, (shown) => toast[shown.type](t(shown.key))),
    [action, t],
  );
}
