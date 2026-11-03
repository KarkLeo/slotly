"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SheetBody } from "@/components/ui/sheet";
import { useOnline } from "@/lib/use-online";
import { updateCurrency } from "./actions";
import { SettingsRow } from "./settings-row";
import {
  SettingsFooter,
  SettingsSheet,
  SettingsWarning,
  useSettingsAction,
} from "./settings-sheet";
import {
  currencies,
  currencyLabel,
  currencySymbol,
  type SettingsView,
} from "./view";

export function CurrencySheet({
  currency,
}: {
  currency: SettingsView["currency"];
}) {
  const t = useTranslations("MasterCabinet.settings.currency");
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <SettingsSheet
      title={t("label")}
      trigger={<SettingsRow label={t("label")} value={currency.label} />}
      open={open}
      onOpenChange={setOpen}
    >
      <CurrencyForm current={currency.code} onSaved={close} />
    </SettingsSheet>
  );
}

function CurrencyForm({
  current,
  onSaved,
}: {
  current: string;
  onSaved: () => void;
}) {
  const t = useTranslations("MasterCabinet.settings");
  const locale = useLocale();
  const online = useOnline();
  const [selected, setSelected] = useState(current);
  const [, action, pending] = useSettingsAction(updateCurrency, onSaved, {});
  const symbol = (code: string) => currencySymbol(code, locale) ?? code;

  return (
    <form action={action} className="flex min-h-0 flex-col gap-4">
      <SheetBody>
        <RadioGroup
          value={selected}
          onValueChange={(value) => setSelected(String(value))}
          aria-label={t("currency.label")}
          disabled={!online}
          className="gap-0"
        >
          {currencies.map((code) => (
            <Label
              key={code}
              className="flex min-h-12 items-center justify-between gap-3 border-b py-2 text-base leading-snug font-normal last:border-b-0"
            >
              <span className="flex flex-col gap-0.5">
                {t(`currency.names.${code}`)}
                <span className="text-sm text-muted-foreground">
                  {currencyLabel(code, locale)}
                </span>
              </span>
              <RadioGroupItem value={code} />
            </Label>
          ))}
        </RadioGroup>
        <input type="hidden" name="currency" value={selected} />
      </SheetBody>
      <SettingsFooter
        label={t("save")}
        pending={pending}
        disabled={selected === current}
        notice={
          selected !== current && (
            <SettingsWarning>
              {t("currency.warning", {
                from: symbol(current),
                to: symbol(selected),
              })}
            </SettingsWarning>
          )
        }
      />
    </form>
  );
}
