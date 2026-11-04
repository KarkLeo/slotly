"use client";

import { useTranslations } from "next-intl";
import { startTransition, useActionState, useId, useOptimistic } from "react";
import { Switch } from "@/components/ui/switch";
import { useOnline } from "@/lib/use-online";
import { useShownToastAction } from "@/toasts/use-shown-toast-action";
import { type ScheduleActionState, setAutoConfirm } from "./actions";

export function AutoConfirmRow({ autoConfirm }: { autoConfirm: boolean }) {
  const t = useTranslations("MasterCabinet.schedule.autoConfirm");
  const online = useOnline();
  const id = useId();
  const [, action, pending] = useActionState<ScheduleActionState, FormData>(
    useShownToastAction(setAutoConfirm),
    {},
  );
  // The requested value shows while saving; a failure falls back to the prop.
  const [shown, setShown] = useOptimistic(autoConfirm);

  function toggle(next: boolean) {
    startTransition(() => {
      setShown(next);
      const data = new FormData();
      data.set("autoConfirm", String(next));
      action(data);
    });
  }

  return (
    <div className="flex min-h-12 items-center gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span id={`${id}-label`} className="text-base font-medium">
          {t("label")}
        </span>
        <span id={`${id}-caption`} className="text-sm text-muted-foreground">
          {t(shown ? "on" : "off")}
        </span>
      </div>
      <Switch
        checked={shown}
        onCheckedChange={toggle}
        disabled={pending || !online}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-caption`}
      />
    </div>
  );
}
