"use client";

import { ClockIcon, TriangleAlertIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { accent } from "@/components/accent";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  groupSlots,
  nearbySlots,
  slotDateTimeLabel,
  slotTimeLabel,
  zoneLabel,
} from "./dates";
import { DateStrip } from "./date-strip";
import { SlotGrid } from "./slot-grid";
import type { Availability } from "./use-availability";
import { ZoneSwitch } from "./zone-switch";

// The date strip and the slot grid of one service, shared by booking and moving a booking.
export function SlotPicker({
  availability,
  taken,
  onSelectDate,
  onSelectSlot,
  headingLevel = 3,
}: {
  availability: Availability;
  taken: string | null;
  onSelectDate: (date: string) => void;
  onSelectSlot: (slot: string) => void;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const t = useTranslations("SlotPicker");
  const locale = useLocale();
  const { timeZone, zones, dates, nearest, selectedDate, slots, selectedSlot } =
    availability;
  const noFreeTime =
    dates.status === "ready" && !dates.value.some((d) => d.available);

  return (
    <>
      {zones && dates.status !== "error" && !noFreeTime && (
        <ZoneSwitch {...zones} onChoose={availability.chooseMasterZone} />
      )}

      {dates.status === "loading" && (
        <div role="status" className="flex flex-col gap-3">
          <span className="sr-only">{t("loading")}</span>
          <Skeleton className="h-6 w-40" />
          <div className="flex gap-1.5">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-15 w-12 rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {dates.status === "error" && (
        <LoadError onRetry={availability.retryDates} />
      )}

      {noFreeTime && (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-card px-4 py-8 text-center">
          <Heading className="text-xl font-extrabold tracking-[-0.02em]">
            {t.rich("noSlotsTitle", { accent })}
          </Heading>
          <p className="text-sm text-muted-foreground">{t("noSlotsText")}</p>
        </div>
      )}

      {dates.status === "ready" && !noFreeTime && (
        <>
          <section aria-labelledby="date-title" className="flex flex-col gap-3">
            <Heading
              id="date-title"
              className="text-xl font-extrabold tracking-[-0.02em]"
            >
              {t.rich("chooseDate", { accent })}
            </Heading>
            {nearest && (
              <button
                type="button"
                onClick={availability.pickNearest}
                className="flex min-h-11 items-center gap-2 rounded-xl border border-input px-3 py-2 text-left text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <ClockIcon
                  aria-hidden
                  className="size-4 shrink-0 text-primary"
                />
                <span>
                  <span className="text-muted-foreground">{t("nearest")}</span>{" "}
                  <span className="font-semibold">
                    {slotDateTimeLabel(nearest, timeZone, locale)}
                  </span>
                </span>
              </button>
            )}
            <DateStrip
              dates={dates.value}
              selected={selectedDate}
              onSelect={onSelectDate}
            />
          </section>

          <section aria-labelledby="time-title" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <Heading
                id="time-title"
                className="text-xl font-extrabold tracking-[-0.02em]"
              >
                {t.rich("chooseTime", { accent })}
              </Heading>
              <span className="text-sm text-muted-foreground">
                {t("timeZone", { zone: zoneLabel(timeZone, locale) })}
              </span>
            </div>
            {taken && slots?.status === "ready" && (
              <SlotTaken
                time={slotTimeLabel(taken, timeZone, locale)}
                nearby={nearbySlots(slots.value, taken).map((value) =>
                  slotTimeLabel(value, timeZone, locale),
                )}
              />
            )}
            {!slots && (
              <p className="text-sm text-muted-foreground">{t("pickDate")}</p>
            )}
            {slots?.status === "loading" && (
              <div role="status" className="grid grid-cols-4 gap-2">
                <span className="sr-only">{t("loading")}</span>
                {Array.from({ length: 8 }, (_, i) => (
                  <Skeleton key={i} className="h-11 rounded-xl" />
                ))}
              </div>
            )}
            {slots?.status === "error" && (
              <LoadError onRetry={availability.retrySlots} />
            )}
            {slots?.status === "ready" && (
              <SlotGrid
                groups={groupSlots(slots.value, timeZone, locale)}
                selected={selectedSlot}
                onSelect={onSelectSlot}
                label={t.markup("chooseTime", { accent: (chunks) => chunks })}
              />
            )}
          </section>
        </>
      )}
    </>
  );
}

function SlotTaken({ time, nearby }: { time: string; nearby: string[] }) {
  const t = useTranslations("SlotPicker");
  const locale = useLocale();
  return (
    <p role="alert" className="flex gap-2 rounded-xl bg-card p-3 text-sm">
      <TriangleAlertIcon
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-warning"
      />
      <span>
        {nearby.length > 0
          ? t("slotTakenNearby", {
              time,
              nearby: new Intl.ListFormat(locale, {
                type: "conjunction",
              }).format(nearby),
            })
          : t("slotTaken", { time })}
      </span>
    </p>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("SlotPicker");
  return (
    <div role="alert" className="flex flex-col items-start gap-2">
      <p className="text-sm">{t("loadError")}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        {t("retry")}
      </Button>
    </div>
  );
}
