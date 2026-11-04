"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/i18n/locales";
import type { LanguageOption } from "./view";

export type LocalizedDraft = Partial<Record<Locale, string>>;

// One field per language of the master, primary first; the others are optional and fall back to it.
export function LocalizedFields({
  name,
  label,
  languages,
  values,
  onChange,
  maxLength,
  disabled,
  error,
  multiline = false,
  required = false,
}: {
  name: string;
  label: string;
  languages: LanguageOption[];
  values: LocalizedDraft;
  onChange: (values: LocalizedDraft) => void;
  maxLength: number;
  disabled: boolean;
  error: string | null;
  multiline?: boolean;
  required?: boolean;
}) {
  const t = useTranslations("MasterCabinet.services.form");
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-3">
      {languages.map(({ locale, label: language }, index) => {
        const inputId = `${id}-${locale}`;
        const invalid = index === 0 && error !== null;
        const props = {
          id: inputId,
          name: `${name}.${locale}`,
          value: values[locale] ?? "",
          maxLength,
          disabled,
          required: required && index === 0,
          "aria-invalid": invalid || undefined,
          "aria-describedby": invalid ? errorId : undefined,
        };
        const optional = !required || index > 0;
        return (
          <Field key={locale} data-invalid={invalid || undefined}>
            <FieldLabel htmlFor={inputId} className="flex-wrap gap-x-1">
              {languages.length > 1 ? `${label} · ${language}` : label}
              {optional && (
                <span className="font-normal text-muted-foreground">
                  {t("optional")}
                </span>
              )}
            </FieldLabel>
            {multiline ? (
              <Textarea
                {...props}
                rows={2}
                onChange={(event) =>
                  onChange({ ...values, [locale]: event.target.value })
                }
              />
            ) : (
              <Input
                {...props}
                onChange={(event) =>
                  onChange({ ...values, [locale]: event.target.value })
                }
              />
            )}
          </Field>
        );
      })}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
