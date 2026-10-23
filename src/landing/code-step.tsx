"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";
import { accent } from "@/components/accent";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { BookingTitle } from "./booking-dialog";

export function CodeStep({
  email,
  invalid = false,
  pending = false,
  resendAt,
  onSubmit,
  onResend,
  onChangeEmail,
}: {
  email: string;
  invalid?: boolean;
  pending?: boolean;
  resendAt: number;
  onSubmit: (code: string) => void;
  onResend: () => void;
  onChangeEmail: () => void;
}) {
  const t = useTranslations("Landing");
  const [malformed, setMalformed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (now >= resendAt) return;
    const timer = setTimeout(() => setNow(Date.now()), 1000);
    return () => clearTimeout(timer);
  }, [now, resendAt]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(
      new FormData(event.currentTarget).get("code") ?? "",
    ).replace(/\s/g, "");
    const wrongFormat = !/^\d{6}$/.test(code);
    setMalformed(wrongFormat);
    if (!wrongFormat) onSubmit(code);
  }

  const error = malformed
    ? t("codeFormat")
    : invalid
      ? t("codeInvalid")
      : undefined;
  const wait = Math.max(0, Math.ceil((resendAt - now) / 1000));

  return (
    <>
      <BookingTitle>{t.rich("codeTitle", { accent })}</BookingTitle>
      <p className="text-muted-foreground">
        {t.rich("codeText", {
          email,
          strong: (chunks) => (
            <strong className="font-semibold text-foreground">{chunks}</strong>
          ),
        })}
      </p>
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="booking-code">{t("code")}</FieldLabel>
          <Input
            id="booking-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="text-center text-2xl tracking-[0.5em]"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "booking-code-error" : undefined}
          />
          {error && <FieldError id="booking-code-error">{error}</FieldError>}
        </Field>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {t("confirm")}
        </Button>
      </form>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={wait > 0} onClick={onResend}>
          {wait > 0
            ? t("resendIn", {
                time: `${Math.floor(wait / 60)}:${String(wait % 60).padStart(2, "0")}`,
              })
            : t("resend")}
        </Button>
        <Button variant="ghost" onClick={onChangeEmail}>
          {t("changeEmail")}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{t("holdNote")}</p>
    </>
  );
}
