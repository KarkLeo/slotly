"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { CommentDialog } from "@/components/comment-dialog";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/toasts/use-action-toast";
import { withUnexpectedToast } from "@/toasts/with-unexpected-toast";
import { cancelBooking, type CancelBookingState } from "./actions";

const submit = withUnexpectedToast(cancelBooking);

export function CancelDialog({ appointmentId }: { appointmentId: string }) {
  const t = useTranslations("MyBookings");
  const [state, action, pending] = useActionState<CancelBookingState, FormData>(
    submit,
    {},
  );
  useActionToast(state.toast);

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
