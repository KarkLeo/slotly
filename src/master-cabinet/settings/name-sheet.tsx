"use client";

import { useTranslations } from "next-intl";
import { useCallback, useId, useState } from "react";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SheetBody } from "@/components/ui/sheet";
import { useOnline } from "@/lib/use-online";
import { type SettingsActionState, updateName } from "./actions";
import { SettingsRow } from "./settings-row";
import {
  SettingsFooter,
  SettingsSheet,
  useSettingsAction,
} from "./settings-sheet";

type NameFormState = SettingsActionState & { name?: string };

// Remembers which name the field error belongs to, so editing the field clears it.
async function updateNameFor(
  state: NameFormState,
  formData: FormData,
): Promise<NameFormState> {
  const name = String(formData.get("name"));
  return { ...(await updateName(state, formData)), name };
}

export function NameSheet({ name }: { name: string }) {
  const t = useTranslations("MasterCabinet.settings");
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <SettingsSheet
      title={t("name.label")}
      trigger={<SettingsRow label={t("name.label")} value={name} />}
      open={open}
      onOpenChange={setOpen}
    >
      <NameForm name={name} onSaved={close} />
    </SettingsSheet>
  );
}

function NameForm({ name, onSaved }: { name: string; onSaved: () => void }) {
  const t = useTranslations("MasterCabinet.settings");
  const online = useOnline();
  const errorId = useId();
  const [value, setValue] = useState(name);
  const [state, action, pending] = useSettingsAction<NameFormState>(
    updateNameFor,
    onSaved,
    {},
  );
  const invalid = state.fieldError === "nameInvalid" && state.name === value;

  return (
    <form action={action} className="flex min-h-0 flex-col gap-4">
      <SheetBody>
        <Field data-invalid={invalid || undefined}>
          <Input
            name="name"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            required
            maxLength={100}
            aria-label={t("name.label")}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? errorId : undefined}
            disabled={!online}
          />
          {invalid && <FieldError id={errorId}>{t("name.invalid")}</FieldError>}
        </Field>
      </SheetBody>
      <SettingsFooter
        label={t("save")}
        pending={pending}
        disabled={value.trim() === name}
      />
    </form>
  );
}
