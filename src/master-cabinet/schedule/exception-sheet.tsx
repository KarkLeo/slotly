"use client";

import { useTranslations } from "next-intl";
import {
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { addDays } from "@/booking/dates";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SheetBody } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useOnline } from "@/lib/use-online";
import {
  SettingsFooter,
  SettingsSheet,
  SettingsWarning,
  useSettingsAction,
} from "../settings/settings-sheet";
import {
  deleteException,
  saveException,
  type ScheduleActionState,
} from "./actions";
import {
  outsideAfterExceptionChange,
  outsideAfterExceptionDelete,
} from "./conflicts";
import { maxPeriodDays, overlappingPeriods, periodLength } from "./exceptions";
import { formatHours, type Interval } from "./hours";
import { IntervalsEditor } from "./intervals-editor";
import { OutsideWarning } from "./outside-warning";
import type { ScheduleView } from "./view";

type Period = ScheduleView["periods"][number];
type Kind = "off" | "hours";

const defaultHours: Interval[] = [{ start: 600, end: 1140 }];

export function ExceptionSheet({
  view,
  period,
  trigger,
}: {
  view: ScheduleView;
  period: Period | null;
  trigger: ReactElement;
}) {
  const t = useTranslations("MasterCabinet.schedule.exception");
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <SettingsSheet
      title={period ? t("titleEdit") : t("titleNew")}
      trigger={trigger}
      open={open}
      onOpenChange={setOpen}
    >
      <ExceptionForm view={view} period={period} onDone={close} />
    </SettingsSheet>
  );
}

function ExceptionForm({
  view,
  period,
  onDone,
}: {
  view: ScheduleView;
  period: Period | null;
  onDone: () => void;
}) {
  const t = useTranslations("MasterCabinet.schedule");
  const online = useOnline();
  const formRef = useRef<HTMLFormElement>(null);
  const tomorrow = addDays(view.today, 1);
  const initialKind: Kind = period?.hours.length ? "hours" : "off";
  const [kind, setKind] = useState<Kind>(initialKind);
  const [from, setFrom] = useState(period?.from ?? tomorrow);
  const [to, setTo] = useState(period?.to ?? tomorrow);
  const [intervals, setIntervals] = useState(
    period?.hours.length ? period.hours : defaultHours,
  );
  const [state, action, pending] = useSettingsAction<ScheduleActionState>(
    saveException,
    onDone,
    {},
  );
  const [, deleteAction, deleting] = useSettingsAction<ScheduleActionState>(
    deleteException,
    onDone,
    {},
  );

  const literal = kind === "hours" ? formatHours(intervals) : "{}";
  const invalid =
    state.fieldError === "intervalsInvalid" && state.submittedHours === literal;
  const length = periodLength(from, to);
  const tooLong = length > maxPeriodDays;
  const unchanged =
    period !== null &&
    kind === initialKind &&
    from === period.from &&
    to === period.to &&
    literal === (period.hours.length > 0 ? formatHours(period.hours) : "{}");
  const replaced = overlappingPeriods(view.periods, from, to, period);

  const changeFrom = (value: string) => {
    if (!value) return;
    const next = value < view.today ? view.today : value;
    setFrom(next);
    if (to < next) setTo(next);
  };
  const changeTo = (value: string) => {
    if (value) setTo(value < from ? from : value);
  };

  // The field at fault may be scrolled out of the sheet.
  useEffect(() => {
    if (state.fieldError)
      formRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
  }, [state]);

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <form
        ref={formRef}
        action={action}
        className="flex min-h-0 flex-col gap-4"
      >
        <SheetBody
          tabIndex={online ? undefined : 0}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="hours" value={literal} />
          {period && (
            <>
              <input type="hidden" name="replacedFrom" value={period.from} />
              <input type="hidden" name="replacedTo" value={period.to} />
            </>
          )}
          <ToggleGroup
            variant="outline"
            aria-label={t("exception.kind")}
            value={[kind]}
            disabled={!online}
            onValueChange={(next) => {
              if (next[0]) setKind(next[0] as Kind);
            }}
            className="w-full"
          >
            {(["off", "hours"] as const).map((value) => (
              <ToggleGroupItem
                key={value}
                value={value}
                className="min-w-0 flex-1 shrink px-2 aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-accent-foreground"
              >
                {t(`exception.${value}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="grid grid-cols-2 gap-3">
            <Label className="flex flex-col items-stretch gap-1.5 text-sm font-medium">
              {t("exception.from")}
              <Input
                type="date"
                name="from"
                min={view.today}
                value={from}
                disabled={!online}
                aria-invalid={tooLong || undefined}
                onChange={(event) => changeFrom(event.target.value)}
              />
            </Label>
            <Label className="flex flex-col items-stretch gap-1.5 text-sm font-medium">
              {t("exception.to")}
              <Input
                type="date"
                name="to"
                min={from}
                value={to}
                disabled={!online}
                aria-invalid={tooLong || undefined}
                onChange={(event) => changeTo(event.target.value)}
              />
            </Label>
          </div>
          {tooLong ? (
            <FieldError>
              {t("exception.tooLong", { max: maxPeriodDays })}
            </FieldError>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("exception.span", { count: length })}
            </p>
          )}
          {kind === "hours" && (
            <IntervalsEditor
              value={intervals}
              onChange={setIntervals}
              invalid={invalid}
              disabled={!online}
            />
          )}
          {replaced.length > 0 && (
            <SettingsWarning>
              {t("exception.replaces", {
                periods: replaced.map((p) => p.dates).join(", "),
              })}
            </SettingsWarning>
          )}
          <OutsideWarning
            appointments={outsideAfterExceptionChange(
              view.appointments,
              view.schedule,
              {
                from,
                to,
                hours: kind === "hours" ? intervals : [],
                replaced: period,
              },
            )}
            text="outside"
          />
          {period && (
            <OutsideWarning
              appointments={outsideAfterExceptionDelete(
                view.appointments,
                view.schedule,
                period,
              )}
              text="afterDelete"
            />
          )}
        </SheetBody>
        <SettingsFooter
          label={t("save")}
          pending={pending}
          disabled={unchanged || tooLong || deleting}
        />
      </form>
      {period && (
        <form action={deleteAction} className="flex flex-col px-4">
          <input type="hidden" name="from" value={period.from} />
          <input type="hidden" name="to" value={period.to} />
          <Button
            type="submit"
            variant="ghost"
            className="text-destructive"
            disabled={!online || pending}
            loading={deleting}
          >
            {t("exception.delete")}
          </Button>
        </form>
      )}
    </div>
  );
}
