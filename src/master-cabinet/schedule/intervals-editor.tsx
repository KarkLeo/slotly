"use client";

import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { defaultHours, type Interval, timeChoices, timeLabel } from "./hours";

const lastStart = 1380;
const dayEnd = 1440;

function nextInterval(value: Interval[]): Interval {
  const last = value.at(-1);
  if (!last) return defaultHours[0];
  const start = Math.min(last.end + 60, lastStart);
  return { start, end: Math.min(start + 240, dayEnd) };
}

export function IntervalsEditor({
  value,
  onChange,
  invalid,
  disabled,
  onEmptied,
}: {
  value: Interval[];
  onChange: (value: Interval[]) => void;
  invalid: boolean;
  disabled: boolean;
  // Called instead of focusing the add button when the last interval is removed.
  onEmptied?: () => void;
}) {
  const t = useTranslations("MasterCabinet.schedule.intervals");
  const errorId = useId();
  const addRef = useRef<HTMLButtonElement>(null);
  const update = (index: number, patch: Partial<Interval>) =>
    onChange(value.map((i, at) => (at === index ? { ...i, ...patch } : i)));

  return (
    <div className="flex flex-col gap-2">
      {value.map((interval, index) => (
        <div
          key={index}
          role="group"
          aria-label={t("row", { n: index + 1 })}
          className="flex items-center gap-2"
        >
          <TimeSelect
            label={t("start")}
            edge="start"
            value={interval.start}
            onChange={(start) => update(index, { start })}
            invalid={invalid}
            errorId={errorId}
            disabled={disabled}
          />
          <span aria-hidden>–</span>
          <TimeSelect
            label={t("end")}
            edge="end"
            value={interval.end}
            onChange={(end) => update(index, { end })}
            invalid={invalid}
            errorId={errorId}
            disabled={disabled}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("remove")}
            disabled={disabled}
            onClick={() => {
              onChange(value.filter((_, at) => at !== index));
              if (value.length === 1 && onEmptied) onEmptied();
              else addRef.current?.focus();
            }}
          >
            <XIcon aria-hidden className="size-5" />
          </Button>
        </div>
      ))}
      <Button
        ref={addRef}
        type="button"
        variant="ghost"
        className="self-start"
        disabled={disabled}
        aria-invalid={invalid && value.length === 0 ? true : undefined}
        aria-describedby={invalid && value.length === 0 ? errorId : undefined}
        onClick={() => onChange([...value, nextInterval(value)])}
      >
        {t("add")}
      </Button>
      {invalid && (
        <FieldError id={errorId}>
          {t(value.length === 0 ? "empty" : "invalid")}
        </FieldError>
      )}
      {value.some((i) => i.end === dayEnd) && (
        <p className="text-sm text-muted-foreground">{t("midnight")}</p>
      )}
    </div>
  );
}

function TimeSelect({
  label,
  edge,
  value,
  onChange,
  invalid,
  errorId,
  disabled,
}: {
  label: string;
  edge: "start" | "end";
  value: number;
  onChange: (value: number) => void;
  invalid: boolean;
  errorId: string;
  disabled: boolean;
}) {
  const items = timeChoices(edge, value).map((minutes) => ({
    value: minutes,
    label: timeLabel(minutes),
  }));
  return (
    <Select
      items={items}
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}
    >
      <SelectTrigger
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        className="min-w-0 flex-1"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
