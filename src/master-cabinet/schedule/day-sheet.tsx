"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { SheetBody } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useOnline } from "@/lib/use-online";
import { SettingsRow } from "../settings/settings-row";
import {
  optionRowClass,
  SettingsFooter,
  SettingsSheet,
  useSettingsAction,
} from "../settings/settings-sheet";
import { saveTemplateDays, type ScheduleActionState } from "./actions";
import { outsideAfterTemplateChange } from "./conflicts";
import { defaultHours, formatHours } from "./hours";
import { IntervalsEditor } from "./intervals-editor";
import { OutsideWarning } from "./outside-warning";
import type { ScheduleView } from "./view";

type Day = ScheduleView["days"][number];

export function DaySheet({ view, day }: { view: ScheduleView; day: Day }) {
  const t = useTranslations("MasterCabinet.schedule");
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <SettingsSheet
      title={day.name}
      trigger={
        <SettingsRow label={day.name} value={day.label ?? t("dayOff")} />
      }
      open={open}
      onOpenChange={setOpen}
    >
      <DayForm view={view} day={day} onSaved={close} />
    </SettingsSheet>
  );
}

function DayForm({
  view,
  day,
  onSaved,
}: {
  view: ScheduleView;
  day: Day;
  onSaved: () => void;
}) {
  const t = useTranslations("MasterCabinet.schedule");
  const online = useOnline();
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const workingRef = useRef<HTMLElement>(null);
  const [intervals, setIntervals] = useState(day.hours);
  const [also, setAlso] = useState<number[]>([]);
  const [state, action, pending] = useSettingsAction<ScheduleActionState>(
    saveTemplateDays,
    onSaved,
    {},
  );
  const literal = formatHours(intervals);
  const invalid =
    state.fieldError === "intervalsInvalid" && state.submittedHours === literal;
  const weekdays = [day.weekday, ...also].sort((a, b) => a - b);
  const unchanged = also.length === 0 && literal === formatHours(day.hours);

  // The field at fault may be scrolled out of the sheet.
  useEffect(() => {
    if (state.fieldError)
      formRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex min-h-0 flex-col gap-4">
      <SheetBody
        tabIndex={online ? undefined : 0}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="hours" value={literal} />
        {weekdays.map((weekday) => (
          <input key={weekday} type="hidden" name="weekdays" value={weekday} />
        ))}
        <Label className={optionRowClass}>
          {t("day.working")}
          <Switch
            ref={workingRef}
            checked={intervals.length > 0}
            onCheckedChange={(on) => setIntervals(on ? defaultHours : [])}
            disabled={!online}
          />
        </Label>
        {intervals.length > 0 ? (
          <IntervalsEditor
            value={intervals}
            onChange={setIntervals}
            invalid={invalid}
            disabled={!online}
            onEmptied={() => workingRef.current?.focus()}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t("day.offHint")}</p>
        )}
        <div className="flex flex-col gap-2">
          <span id={`${id}-also`} className="text-sm font-medium">
            {t("day.alsoFor")}
          </span>
          <ToggleGroup
            multiple
            variant="outline"
            aria-labelledby={`${id}-also`}
            value={weekdays.map(String)}
            disabled={!online}
            onValueChange={(next) =>
              setAlso(
                next.map(Number).filter((weekday) => weekday !== day.weekday),
              )
            }
            className="w-full"
          >
            {view.days.map((other) => (
              <ToggleGroupItem
                key={other.weekday}
                value={String(other.weekday)}
                disabled={other.weekday === day.weekday}
                className="min-w-0 flex-1 shrink px-1 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary"
              >
                {other.short}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <OutsideWarning
          appointments={outsideAfterTemplateChange(
            view.appointments,
            view.schedule,
            weekdays,
            intervals,
          )}
          text="outside"
        />
      </SheetBody>
      <SettingsFooter
        label={t("save")}
        pending={pending}
        disabled={unchanged}
      />
    </form>
  );
}
