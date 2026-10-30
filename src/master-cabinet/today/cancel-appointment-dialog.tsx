"use client";

import { useTranslations } from "next-intl";
import { CommentDialog } from "@/components/comment-dialog";
import { Button } from "@/components/ui/button";

export function CancelAppointmentDialog({
  appointmentId,
  describedBy,
  action,
  pending,
  disabled = false,
}: {
  appointmentId: string;
  describedBy?: string;
  action: (formData: FormData) => void;
  pending: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations("MasterCabinet.today.decline");

  return (
    <CommentDialog
      trigger={
        <Button
          variant="outline"
          className="flex-1"
          aria-describedby={describedBy}
        >
          {t("open")}
        </Button>
      }
      title={t("title")}
      text={t("text")}
      commentLabel={t("comment")}
      optionalLabel={t("optional")}
      placeholder={t("placeholder")}
      submitLabel={t("submit")}
      backLabel={t("back")}
      action={action}
      pending={pending}
      disabled={disabled}
    >
      <input type="hidden" name="appointmentId" value={appointmentId} />
    </CommentDialog>
  );
}
