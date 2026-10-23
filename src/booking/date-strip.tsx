"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { dayLabel } from "./dates";

export function DateStrip({
  dates,
  selected,
  onSelect,
}: {
  dates: { date: string; available: boolean }[];
  selected: string | null;
  onSelect: (date: string) => void;
}) {
  const t = useTranslations("SlotPicker");
  const locale = useLocale();
  const strip = useRef<HTMLDivElement>(null);

  // A date picked from outside the strip (the nearest-time hint) may be scrolled out of sight.
  useEffect(() => {
    strip.current
      ?.querySelector("input:checked")
      ?.closest("label")
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [selected]);

  return (
    <fieldset className="-mx-4 min-w-0">
      <legend className="sr-only">{t("dates")}</legend>
      <div ref={strip} className="flex gap-1.5 overflow-x-auto px-4 pb-2">
        {dates.map(({ date, available }, index) => {
          const label = dayLabel(date, locale);
          const showMonth = index === 0 || date.endsWith("-01");
          return (
            <div key={date} className="flex shrink-0 flex-col gap-1">
              <span
                aria-hidden
                className="h-4 text-xs font-semibold text-muted-foreground"
              >
                {showMonth ? label.month : ""}
              </span>
              <label className="flex min-h-15 w-12 cursor-pointer flex-col items-center justify-center rounded-xl bg-card transition-colors has-checked:bg-primary has-checked:text-primary-foreground has-disabled:cursor-default has-disabled:bg-transparent has-disabled:text-muted-foreground has-disabled:line-through has-focus-visible:ring-2 has-focus-visible:ring-ring has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-background">
                <input
                  type="radio"
                  name="date"
                  value={date}
                  checked={date === selected}
                  disabled={!available}
                  onChange={() => onSelect(date)}
                  aria-label={label.full}
                  className="sr-only"
                />
                <span aria-hidden className="text-xs">
                  {label.weekday}
                </span>
                <span aria-hidden className="font-bold">
                  {label.day}
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
