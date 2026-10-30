"use client";

import { type ReactElement, type ReactNode, useId } from "react";
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

export function CommentDialog({
  trigger,
  title,
  text,
  commentLabel,
  optionalLabel,
  placeholder,
  submitLabel,
  backLabel,
  action,
  pending,
  disabled = false,
  children,
}: {
  trigger: ReactElement;
  title: string;
  text: string;
  commentLabel: string;
  optionalLabel: string;
  placeholder: string;
  submitLabel: string;
  backLabel: string;
  action: (formData: FormData) => void;
  pending: boolean;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const commentId = useId();

  return (
    <Dialog>
      <DialogTrigger disabled={disabled} render={trigger} />
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold tracking-[-0.02em]">
            {title}
          </DialogTitle>
          <DialogDescription>{text}</DialogDescription>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-3">
          {children}
          <Field>
            <FieldLabel htmlFor={commentId}>
              {commentLabel}{" "}
              <span className="font-normal text-muted-foreground">
                {optionalLabel}
              </span>
            </FieldLabel>
            <Textarea
              id={commentId}
              name="comment"
              rows={3}
              maxLength={500}
              placeholder={placeholder}
              className="resize-none"
            />
          </Field>
          <Button
            type="submit"
            variant="destructive"
            disabled={disabled}
            loading={pending}
          >
            {submitLabel}
          </Button>
          <DialogClose disabled={pending} render={<Button variant="outline" />}>
            {backLabel}
          </DialogClose>
        </form>
      </DialogContent>
    </Dialog>
  );
}
