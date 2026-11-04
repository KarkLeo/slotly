"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SheetBody } from "@/components/ui/sheet";
import { useOnline } from "@/lib/use-online";
import type { Locale } from "@/i18n/locales";
import { SettingsRow } from "../settings/settings-row";
import {
  optionRowClass,
  SettingsFooter,
  SettingsSheet,
  SettingsWarning,
  useSettingsAction,
} from "../settings/settings-sheet";
import { updateBookingParam } from "./actions";
import {
  type ParamKey,
  paramLabel,
  paramOptions,
  type ScheduleView,
} from "./view";

type Param = ScheduleView["params"][number];

function useParamText() {
  const t = useTranslations("MasterCabinet.schedule.params");
  const locale = useLocale() as Locale;
  return (key: ParamKey, value: number) =>
    paramLabel(key, value, locale) ??
    (key === "notice" ? t("noLimit") : t("untilStart"));
}

export function ParamSheet({ param }: { param: Param }) {
  const t = useTranslations("MasterCabinet.schedule.params");
  const text = useParamText();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const label = t(`${param.key}.label`);

  return (
    <SettingsSheet
      title={label}
      trigger={
        <SettingsRow label={label} value={text(param.key, param.value)} />
      }
      open={open}
      onOpenChange={setOpen}
    >
      <ParamForm param={param} onSaved={close} />
    </SettingsSheet>
  );
}

function ParamForm({ param, onSaved }: { param: Param; onSaved: () => void }) {
  const t = useTranslations("MasterCabinet.schedule");
  const text = useParamText();
  const online = useOnline();
  const [selected, setSelected] = useState(param.value);
  const [, action, pending] = useSettingsAction(
    updateBookingParam,
    onSaved,
    {},
  );
  const changed = selected !== param.value;

  return (
    <form action={action} className="flex min-h-0 flex-col gap-4">
      <SheetBody tabIndex={online ? undefined : 0}>
        <p className="pb-2 text-sm text-muted-foreground">
          {t(`params.${param.key}.hint`)}
        </p>
        <RadioGroup
          value={String(selected)}
          onValueChange={(value) => setSelected(Number(value))}
          aria-label={t(`params.${param.key}.label`)}
          disabled={!online}
          className="gap-0"
        >
          {paramOptions(param.key, param.value).map((value) => (
            <Label key={value} className={optionRowClass}>
              {text(param.key, value)}
              <RadioGroupItem value={String(value)} />
            </Label>
          ))}
        </RadioGroup>
        <input type="hidden" name="key" value={param.key} />
        <input type="hidden" name="value" value={selected} />
      </SheetBody>
      <SettingsFooter
        label={t("save")}
        pending={pending}
        disabled={!changed}
        notice={
          changed &&
          param.key === "deadline" && (
            <SettingsWarning>{t("params.deadlineWarning")}</SettingsWarning>
          )
        }
      />
    </form>
  );
}
