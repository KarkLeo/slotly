"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { useOnline } from "@/lib/use-online";
import { useShownToastAction } from "@/toasts/use-shown-toast-action";
import {
  type AppointmentActionState,
  cancelAppointment,
  confirmAppointment,
} from "./actions";
import { CancelAppointmentDialog } from "./cancel-appointment-dialog";

export function DecisionActions({
  appointmentId,
  describedBy,
}: {
  appointmentId: string;
  describedBy: string;
}) {
  const t = useTranslations("MasterCabinet.today");
  const online = useOnline();
  const [, confirm, confirming] = useActionState<
    AppointmentActionState,
    FormData
  >(useShownToastAction(confirmAppointment), {});
  const [, decline, declining] = useActionState<
    AppointmentActionState,
    FormData
  >(useShownToastAction(cancelAppointment), {});
  const pending = confirming || declining;

  return (
    <div className="flex gap-2">
      <form action={confirm} className="flex flex-1">
        <input type="hidden" name="appointmentId" value={appointmentId} />
        <Button
          type="submit"
          className="flex-1"
          aria-describedby={describedBy}
          disabled={!online || declining}
          loading={confirming}
        >
          {t("confirm")}
        </Button>
      </form>
      <CancelAppointmentDialog
        appointmentId={appointmentId}
        describedBy={describedBy}
        action={decline}
        pending={declining}
        disabled={!online || pending}
      />
    </div>
  );
}
