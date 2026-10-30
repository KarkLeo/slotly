"use client";

import { useTranslations } from "next-intl";
import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useShownToastAction } from "@/toasts/use-shown-toast-action";
import { type AppointmentActionState, cancelAppointment } from "./actions";

export function CancelAppointmentDialog({
  appointmentId,
  variant,
  disabled = false,
}: {
  appointmentId: string;
  variant: "decline";
  disabled?: boolean;
}) {
  const t = useTranslations(`MasterCabinet.today.${variant}`);
  const commentId = useId();
  const [, action, pending] = useActionState<AppointmentActionState, FormData>(
    useShownToastAction(cancelAppointment),
    {},
  );

  return (
    <Dialog>
      <DialogTrigger
        disabled={disabled}
        render={<Button variant="outline" className="flex-1" />}
      >
        {t("open")}
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold tracking-[-0.02em]">
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("text")}</DialogDescription>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <input type="hidden" name="variant" value={variant} />
          <Field>
            <FieldLabel htmlFor={commentId}>
              {t("comment")}{" "}
              <span className="font-normal text-muted-foreground">
                {t("optional")}
              </span>
            </FieldLabel>
            <Textarea
              id={commentId}
              name="comment"
              rows={3}
              maxLength={500}
              placeholder={t("placeholder")}
              className="resize-none"
            />
          </Field>
          <Button
            type="submit"
            variant="destructive"
            disabled={disabled}
            loading={pending}
          >
            {t("submit")}
          </Button>
          <DialogClose render={<Button variant="outline" />}>
            {t("back")}
          </DialogClose>
        </form>
      </DialogContent>
    </Dialog>
  );
}
