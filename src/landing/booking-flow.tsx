"use client";

import { ClockIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { DateStrip } from "@/booking/date-strip";
import { groupSlots, slotDateTimeLabel, zoneLabel } from "@/booking/dates";
import { SlotGrid } from "@/booking/slot-grid";
import { useAvailability } from "@/booking/use-availability";
import { accent } from "@/components/accent";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAvailableDays, fetchAvailableSlots } from "./booking-api";
import { ContactStep, type ContactValues } from "./contact-step";
import { Price } from "./text";
import type { ServiceView } from "./view";

export function BookingFlow({
  service,
  timeZone,
  horizonDays,
  onContactSubmit,
}: {
  service: ServiceView;
  timeZone: string;
  horizonDays: number;
  onContactSubmit?: (values: ContactValues & { slot: string }) => void;
}) {
  const t = useTranslations("SlotPicker");
  const tl = useTranslations("Landing");
  const locale = useLocale();
  const fetchDays = useCallback(
    (from: string, to: string) => fetchAvailableDays(service.id, from, to),
    [service.id],
  );
  const fetchSlots = useCallback(
    (day: string) => fetchAvailableSlots(service.id, day),
    [service.id],
  );
  const availability = useAvailability({
    timeZone,
    horizonDays,
    fetchDays,
    fetchSlots,
  });
  const { dates, nearest, selectedDate, slots, selectedSlot } = availability;
  const [contact, setContact] = useState(false);
  const next = useRef<HTMLButtonElement>(null);

  // The contact step is a screen of its own: the phone's back gesture closes it instead of leaving the page.
  useEffect(() => {
    if (!contact) return;
    const close = () => {
      setContact(false);
      requestAnimationFrame(() => next.current?.focus());
    };
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, [contact]);

  function openContact() {
    window.history.pushState(null, "", window.location.href);
    setContact(true);
  }

  const when = selectedSlot
    ? slotDateTimeLabel(selectedSlot, timeZone, locale)
    : null;
  const noFreeTime =
    dates.status === "ready" && !dates.value.some((d) => d.available);

  return (
    <>
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
          <h3 className="text-xl font-extrabold tracking-[-0.02em]">
            {t.rich("noSlotsTitle", { accent })}
          </h3>
          <p className="text-sm text-muted-foreground">{t("noSlotsText")}</p>
        </div>
      )}

      {dates.status === "ready" && !noFreeTime && (
        <>
          <section aria-labelledby="date-title" className="flex flex-col gap-3">
            <h3
              id="date-title"
              className="text-xl font-extrabold tracking-[-0.02em]"
            >
              {t.rich("chooseDate", { accent })}
            </h3>
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
              onSelect={availability.selectDate}
            />
          </section>

          <section aria-labelledby="time-title" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3
                id="time-title"
                className="text-xl font-extrabold tracking-[-0.02em]"
              >
                {t.rich("chooseTime", { accent })}
              </h3>
              <span className="text-sm text-muted-foreground">
                {t("timeZone", { zone: zoneLabel(timeZone, locale) })}
              </span>
            </div>
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
                onSelect={availability.selectSlot}
                label={t.markup("chooseTime", { accent: (chunks) => chunks })}
              />
            )}
          </section>
        </>
      )}

      <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 text-sm">
            <div className="truncate font-semibold">{service.name}</div>
            <div className="truncate text-muted-foreground">
              {when ?? service.duration}
              {service.price.amount && (
                <>
                  {" · "}
                  <Price price={service.price} />
                </>
              )}
            </div>
          </div>
          <Button
            ref={next}
            size="lg"
            disabled={!selectedSlot}
            onClick={openContact}
          >
            {tl("next")}
          </Button>
        </div>
      </div>

      {contact && selectedSlot && when && (
        <ContactStep
          summary={{ service: service.name, when, price: service.price }}
          needsAddress={service.format === "at_client"}
          onBack={() => window.history.back()}
          onSubmit={
            onContactSubmit &&
            ((values) => onContactSubmit({ ...values, slot: selectedSlot }))
          }
        />
      )}
    </>
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
