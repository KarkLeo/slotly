"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { ActionToast } from "./toast";

export function useActionToast(actionToast: ActionToast | undefined) {
  const t = useTranslations("Toasts");
  // Strict mode runs effects twice; a result is shown once.
  const shown = useRef<ActionToast | undefined>(undefined);

  useEffect(() => {
    if (!actionToast || shown.current === actionToast) return;
    shown.current = actionToast;
    toast[actionToast.type](t(actionToast.key));
  }, [actionToast, t]);
}
