"use client";

import { useTranslations } from "next-intl";
import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { useOnline } from "@/lib/use-online";
import { useShownToastAction } from "@/toasts/use-shown-toast-action";
import { type AppointmentActionState, confirmAppointment } from "./actions";
import { CancelAppointmentDialog } from "./cancel-appointment-dialog";
import type { AwaitingView } from "./view";

export function AwaitingCard({ item }: { item: AwaitingView }) {
  const t = useTranslations("MasterCabinet.today");
  const online = useOnline();
  const subjectId = useId();
  const [, action, pending] = useActionState<AppointmentActionState, FormData>(
    useShownToastAction(confirmAppointment),
    {},
  );

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-dashed border-primary bg-card p-3.5">
      <div id={subjectId} className="min-w-0">
        <p className="font-bold break-words">{item.clientName}</p>
        <p className="text-sm break-words text-muted-foreground">
          {item.service} · {t("when", item.when)}
        </p>
      </div>
      <p className="text-[13px] font-semibold text-warning">
        {t("answerBy", item.answerBy)}
      </p>
      <div className="flex gap-2">
        <form action={action} className="flex flex-1">
          <input type="hidden" name="appointmentId" value={item.id} />
          <Button
            type="submit"
            className="flex-1"
            aria-describedby={subjectId}
            disabled={!online}
            loading={pending}
          >
            {t("confirm")}
          </Button>
        </form>
        <CancelAppointmentDialog
          appointmentId={item.id}
          variant="decline"
          describedBy={subjectId}
          disabled={!online || pending}
        />
      </div>
    </div>
  );
}
