"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { signIn, type SignInState } from "./actions";

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-ring";
const buttonClass =
  "w-full rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground disabled:opacity-50";

const initialState: SignInState = { step: "email" };

export function SignInForm({
  next,
  linkExpired,
}: {
  next?: string;
  linkExpired?: boolean;
}) {
  const t = useTranslations("SignIn");
  const [state, action, pending] = useActionState(signIn, initialState);
  const [editingEmail, setEditingEmail] = useState(false);

  const error = state.error && (
    <p role="alert" className="text-sm text-destructive">
      {t(`errors.${state.error}`)}
    </p>
  );

  if (state.step === "code" && !editingEmail) {
    return (
      <form action={action} className="flex w-full flex-col gap-4">
        <h1 className="text-2xl font-semibold">{t("codeSentTitle")}</h1>
        <p className="text-sm">{t("codeSent", { email: state.email })}</p>
        <input type="hidden" name="intent" value="verify" />
        <input type="hidden" name="email" value={state.email} />
        <input type="hidden" name="next" value={next ?? ""} />
        <label className="flex flex-col gap-1 text-sm">
          {t("codeLabel")}
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            className={`${inputClass} tracking-[0.4em]`}
          />
        </label>
        {error}
        <button type="submit" disabled={pending} className={buttonClass}>
          {t("verify")}
        </button>
        <button
          type="button"
          onClick={() => setEditingEmail(true)}
          className="text-sm underline"
        >
          {t("useAnotherEmail")}
        </button>
      </form>
    );
  }

  return (
    <form
      action={(formData) => {
        setEditingEmail(false);
        action(formData);
      }}
      className="flex w-full flex-col gap-4"
    >
      {linkExpired && state === initialState && (
        <p role="alert" className="text-sm text-destructive">
          {t("errors.expiredLink")}
        </p>
      )}
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <label className="flex flex-col gap-1 text-sm">
        {t("emailLabel")}
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          defaultValue={state.step === "code" ? state.email : undefined}
          placeholder="you@example.com"
          className={inputClass}
        />
      </label>
      {state.step === "email" && error}
      <button type="submit" disabled={pending} className={buttonClass}>
        {t("sendLink")}
      </button>
    </form>
  );
}
