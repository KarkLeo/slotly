"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { CommentDialog } from "@/components/comment-dialog";
import { Button } from "@/components/ui/button";
import { useShownToastAction } from "@/toasts/use-shown-toast-action";
import { cancelBooking, type CancelBookingState } from "./actions";

export function CancelDialog({ appointmentId }: { appointmentId: string }) {
  const t = useTranslations("MyBookings");
  const [, action, pending] = useActionState<CancelBookingState, FormData>(
    useShownToastAction(cancelBooking),
    {},
  );

  return (
    <CommentDialog
      trigger={
        <Button variant="outline" className="flex-1 text-destructive">
          {t("cancel")}
        </Button>
      }
      title={t("cancelTitle")}
      text={t("cancelText")}
      commentLabel={t("comment")}
      optionalLabel={t("optional")}
      placeholder={t("commentPlaceholder")}
      submitLabel={t("cancelConfirm")}
      backLabel={t("back")}
      action={action}
      pending={pending}
    >
      <input type="hidden" name="appointmentId" value={appointmentId} />
    </CommentDialog>
  );
}
