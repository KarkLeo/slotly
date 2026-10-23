"use client";

import { useTranslations } from "next-intl";
import type { SlotGroup } from "./dates";

export function SlotGrid({
  groups,
  selected,
  onSelect,
  label,
}: {
  groups: SlotGroup[];
  selected: string | null;
  onSelect: (slot: string) => void;
  label: string;
}) {
  const t = useTranslations("SlotPicker");

  return (
    <fieldset className="flex min-w-0 flex-col gap-4">
      <legend className="sr-only">{label}</legend>
      {groups.map((group) => (
        <div key={group.period} className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-muted-foreground">
            {t(group.period)}
          </span>
          <div className="grid grid-cols-4 gap-2">
            {group.slots.map((slot) => (
              <label
                key={slot.value}
                className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-border font-semibold transition-colors hover:bg-muted has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-background"
              >
                <input
                  type="radio"
                  name="slot"
                  value={slot.value}
                  checked={slot.value === selected}
                  onChange={() => onSelect(slot.value)}
                  className="sr-only"
                />
                {slot.label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </fieldset>
  );
}
