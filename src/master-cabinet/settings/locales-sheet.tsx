"use client";

import { useTranslations } from "next-intl";
import { useCallback, useId, useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SheetBody } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { isLocale, type Locale, locales } from "@/i18n/locales";
import { useOnline } from "@/lib/use-online";
import { updateLocales } from "./actions";
import { SettingsRow } from "./settings-row";
import {
  SettingsFooter,
  SettingsSheet,
  SettingsWarning,
  useSettingsAction,
} from "./settings-sheet";
import type { SettingsView } from "./view";

const optionClass =
  "flex min-h-12 items-center justify-between gap-3 border-b py-2 text-base leading-snug font-normal last:border-b-0";

export function LocalesSheet({ view }: { view: SettingsView }) {
  const t = useTranslations("MasterCabinet.settings.locales");
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <SettingsSheet
      title={t("title")}
      trigger={<SettingsRow label={t("label")} value={view.localesSummary} />}
      open={open}
      onOpenChange={setOpen}
    >
      <LocalesForm
        locales={view.locales}
        primaryLocale={view.primaryLocale}
        onSaved={close}
      />
    </SettingsSheet>
  );
}

function LocalesForm({
  locales: initial,
  primaryLocale,
  onSaved,
}: {
  locales: Locale[];
  primaryLocale: Locale;
  onSaved: () => void;
}) {
  const t = useTranslations("MasterCabinet.settings");
  const names = useTranslations("LocaleSwitcher");
  const online = useOnline();
  const primaryId = useId();
  const [enabled, setEnabled] = useState<Locale[]>(initial);
  const [primary, setPrimary] = useState(primaryLocale);
  const [, action, pending] = useSettingsAction(updateLocales, onSaved, {});
  const turnedOff = initial.filter((locale) => !enabled.includes(locale));

  const toggle = (locale: Locale, on: boolean) =>
    setEnabled((before) =>
      on
        ? locales.filter((l) => l === locale || before.includes(l))
        : before.filter((l) => l !== locale),
    );

  return (
    <form action={action} className="flex min-h-0 flex-col gap-4">
      <SheetBody className="flex flex-col gap-3 py-1">
        <div className="flex flex-col">
          {locales.map((locale) => (
            <Label key={locale} className={optionClass}>
              <span className="flex flex-col gap-0.5">
                {names(locale)}
                {locale === primary && (
                  <span className="text-sm text-muted-foreground">
                    {t("locales.primaryBadge")}
                  </span>
                )}
              </span>
              <Switch
                checked={enabled.includes(locale)}
                onCheckedChange={(on) => toggle(locale, on)}
                disabled={locale === primary || !online}
              />
            </Label>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <h3
            id={primaryId}
            className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
          >
            {t("locales.primaryLabel")}
          </h3>
          <RadioGroup
            value={primary}
            onValueChange={(value) => {
              if (isLocale(value)) setPrimary(value);
            }}
            aria-labelledby={primaryId}
            disabled={!online}
            className="gap-0"
          >
            {locales
              .filter((locale) => enabled.includes(locale))
              .map((locale) => (
                <Label key={locale} className={optionClass}>
                  {names(locale)}
                  <RadioGroupItem value={locale} />
                </Label>
              ))}
          </RadioGroup>
          <p className="text-sm text-muted-foreground">
            {t("locales.primaryHint")}
          </p>
        </div>
        {enabled.map((locale) => (
          <input key={locale} type="hidden" name="locales" value={locale} />
        ))}
        <input type="hidden" name="primaryLocale" value={primary} />
      </SheetBody>
      <SettingsFooter
        label={t("save")}
        pending={pending}
        notice={
          turnedOff.length > 0 && (
            <SettingsWarning>
              {t("locales.turnOff", {
                languages: turnedOff.map((locale) => names(locale)).join(", "),
                count: turnedOff.length,
              })}
            </SettingsWarning>
          )
        }
      />
    </form>
  );
}
