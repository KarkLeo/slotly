"use client";

import { useLocale, useTranslations } from "next-intl";
import { zoneLabel } from "./dates";

export function ZoneSwitch({
  client,
  master,
  masterChosen,
  onChoose,
}: {
  client: string;
  master: string;
  masterChosen: boolean;
  onChoose: (masterChosen: boolean) => void;
}) {
  const t = useTranslations("SlotPicker");
  const locale = useLocale();
  const options = [
    { master: false, label: t("clientZone"), zone: client },
    { master: true, label: t("masterZone"), zone: master },
  ];

  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{t("zones")}</legend>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-card p-1">
        {options.map((option) => (
          <label
            key={option.label}
            className="group flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-lg px-2 py-1.5 text-center transition-colors hover:bg-muted has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-background"
          >
            <input
              type="radio"
              name="zone"
              checked={option.master === masterChosen}
              onChange={() => onChoose(option.master)}
              className="sr-only"
            />
            <span className="text-sm font-semibold">{option.label}</span>
            <span className="text-xs text-muted-foreground group-has-checked:text-primary-foreground">
              {zoneLabel(option.zone, locale)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
