"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionToast } from "@/toasts/use-action-toast";
import { withUnexpectedToast } from "@/toasts/with-unexpected-toast";
import { signIn, type SignInState } from "./actions";

const initialState: SignInState = { step: "email" };

const submit = withUnexpectedToast(signIn, (state, formData): SignInState =>
  state.step === "email"
    ? { step: "email", email: String(formData.get("email") ?? "").trim() }
    : state,
);

export function SignInForm({ next }: { next?: string }) {
  const t = useTranslations("SignIn");
  const [state, action, pending] = useActionState(submit, initialState);
  const [editingEmail, setEditingEmail] = useState(false);
  useActionToast(state.toast);

  if (state.step === "code" && !editingEmail) {
    const invalid = state.error === "invalidCode";
    return (
      <form action={action} className="flex w-full flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight">
            {t("codeSentTitle")}
          </h1>
          <p className="text-muted-foreground">
            {t("codeSent", { email: state.email })}
          </p>
        </div>
        <input type="hidden" name="intent" value="verify" />
        <input type="hidden" name="email" value={state.email} />
        <input type="hidden" name="next" value={next ?? ""} />
        <Field data-invalid={invalid || undefined}>
          <FieldLabel htmlFor="code">{t("codeLabel")}</FieldLabel>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? "code-error" : undefined}
            className="tracking-[0.4em]"
          />
          {invalid && (
            <FieldError id="code-error">{t("errors.invalidCode")}</FieldError>
          )}
        </Field>
        <Button type="submit" loading={pending} className="w-full">
          {t("verify")}
        </Button>
        <Button
          type="button"
          variant="link"
          onClick={() => setEditingEmail(true)}
        >
          {t("useAnotherEmail")}
        </Button>
      </form>
    );
  }

  const invalid = state.step === "email" && state.error === "invalidEmail";
  return (
    <form
      action={(formData) => {
        setEditingEmail(false);
        action(formData);
      }}
      className="flex w-full flex-col gap-5"
    >
      <h1 className="text-2xl font-extrabold tracking-tight">{t("title")}</h1>
      <Field data-invalid={invalid || undefined}>
        <FieldLabel htmlFor="email">{t("emailLabel")}</FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          defaultValue={state.email}
          placeholder="you@example.com"
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? "email-error" : undefined}
        />
        {invalid && (
          <FieldError id="email-error">{t("errors.invalidEmail")}</FieldError>
        )}
      </Field>
      <Button type="submit" loading={pending} className="w-full">
        {t("sendLink")}
      </Button>
    </form>
  );
}
