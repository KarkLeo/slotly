"use client";

import { ArrowLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { accent } from "@/components/accent";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Price } from "./text";
import type { ServiceView } from "./view";

export type ContactValues = { name: string; email: string; address: string };

type Errors = Partial<Record<keyof ContactValues, string>>;

export function ContactStep({
  summary,
  needsAddress,
  onBack,
  onSubmit,
}: {
  summary: { service: string; when: string; price: ServiceView["price"] };
  needsAddress: boolean;
  onBack: () => void;
  onSubmit?: (values: ContactValues) => void;
}) {
  const t = useTranslations("Landing");
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [errors, setErrors] = useState<Errors>({});

  // A modal dialog keeps the page behind out of reach of focus and screen readers.
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    heading.current?.focus();
    return () => element?.close();
  }, []);

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
    <dialog
      ref={dialog}
      aria-labelledby="contact-title"
      onCancel={(event) => {
        event.preventDefault();
        onBack();
      }}
      className="m-0 h-full max-h-none w-full max-w-none overflow-y-auto bg-background p-0 text-foreground backdrop:bg-background"
    >
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 pt-2 pb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label={t("back")}
          className="-ml-3"
        >
          <ArrowLeftIcon />
        </Button>
        <h1
          id="contact-title"
          ref={heading}
          tabIndex={-1}
          className="text-3xl font-extrabold tracking-[-0.03em] outline-none"
        >
          {t.rich("contactTitle", { accent })}
        </h1>
        <div className="flex flex-col gap-1 rounded-xl bg-card p-4">
          <span className="font-semibold">{summary.service}</span>
          <span className="text-sm text-muted-foreground">
            {summary.when}
            {summary.price.amount && (
              <>
                {" · "}
                <Price price={summary.price} />
              </>
            )}
          </span>
        </div>
        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
          <TextField
            name="name"
            label={t("name")}
            autoComplete="name"
            error={errors.name}
          />
          <TextField
            name="email"
            type="email"
            label={t("email")}
            autoComplete="email"
            inputMode="email"
            error={errors.email}
          />
          {needsAddress && (
            <TextField
              name="address"
              label={t("address")}
              autoComplete="street-address"
              error={errors.address}
            />
          )}
          <Button type="submit" size="lg" disabled={!onSubmit}>
            {t("sendCode")}
          </Button>
        </form>
      </div>
    </dialog>
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
