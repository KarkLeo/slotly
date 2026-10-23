"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { accent } from "@/components/accent";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  BookingSummary,
  BookingTitle,
  type BookingSummaryView,
} from "./booking-dialog";

export type ContactValues = { name: string; email: string; address: string };

type Errors = Partial<Record<keyof ContactValues, string>>;

export function ContactStep({
  summary,
  needsAddress,
  defaultValues,
  pending = false,
  limitReached = false,
  onSubmit,
}: {
  summary: BookingSummaryView;
  needsAddress: boolean;
  defaultValues?: ContactValues;
  pending?: boolean;
  limitReached?: boolean;
  onSubmit?: (values: ContactValues) => void;
}) {
  const t = useTranslations("Landing");
  const [errors, setErrors] = useState<Errors>({});

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      address: String(data.get("address") ?? "").trim(),
    };
    const next: Errors = {};
    if (!values.name) next.name = t("nameRequired");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      next.email = t("emailInvalid");
    }
    if (needsAddress && !values.address) next.address = t("addressRequired");
    setErrors(next);
    if (Object.keys(next).length === 0) onSubmit?.(values);
  }

  return (
    <>
      <BookingTitle>{t.rich("contactTitle", { accent })}</BookingTitle>
      <BookingSummary summary={summary} />
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        <TextField
          name="name"
          label={t("name")}
          autoComplete="name"
          defaultValue={defaultValues?.name}
          error={errors.name}
        />
        <TextField
          name="email"
          type="email"
          label={t("email")}
          autoComplete="email"
          inputMode="email"
          defaultValue={defaultValues?.email}
          error={errors.email}
        />
        {needsAddress && (
          <TextField
            name="address"
            label={t("address")}
            autoComplete="street-address"
            defaultValue={defaultValues?.address}
            error={errors.address}
          />
        )}
        {limitReached && (
          <p role="alert" className="rounded-xl bg-card p-4 text-sm">
            {t("limitReached")}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          disabled={!onSubmit || pending}
          aria-busy={pending || undefined}
        >
          {t("sendCode")}
        </Button>
      </form>
    </>
  );
}

function TextField({
  name,
  label,
  error,
  ...props
}: {
  name: keyof ContactValues;
  label: string;
  error?: string;
} & Omit<React.ComponentProps<typeof Input>, "name">) {
  const id = `contact-${name}`;
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
}
