"use client";

import { ChevronLeftIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useState, useTransition } from "react";
import { slotDateTimeLabel } from "@/booking/dates";
import { SlotPicker } from "@/booking/slot-picker";
import { useAvailability } from "@/booking/use-availability";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ActionToast } from "@/toasts/toast";
import { useActionToast } from "@/toasts/use-action-toast";
import { unexpectedToast } from "@/toasts/with-unexpected-toast";
import { rescheduleBooking } from "./actions";
import { fetchRescheduleDays, fetchRescheduleSlots } from "./reschedule-api";
import type { BookingView } from "./view";

export function RescheduleScreen({ booking }: { booking: BookingView }) {
  const t = useTranslations("MyBookings");
  const locale = useLocale();
  const { serviceId, startsAt, timeZone, horizonDays } = booking.slots;
  const fetchDays = useCallback(
    (from: string, to: string) =>
      fetchRescheduleDays(serviceId, booking.id, from, to),
    [serviceId, booking.id],
  );
  const fetchSlots = useCallback(
    async (day: string) => {
      const current = new Date(startsAt).getTime();
      return (await fetchRescheduleSlots(serviceId, booking.id, day)).filter(
        (slot) => new Date(slot).getTime() !== current,
      );
    },
    [serviceId, booking.id, startsAt],
  );
  const availability = useAvailability({
    timeZone,
    horizonDays,
    fetchDays,
    fetchSlots,
  });
  const { selectedSlot } = availability;
  const [taken, setTaken] = useState<string | null>(null);
  const [toast, setToast] = useState<ActionToast>();
  const [pending, startTransition] = useTransition();
  useActionToast(toast);

  function submit() {
    if (!selectedSlot) return;
    const slot = selectedSlot;
    startTransition(async () => {
      try {
        const result = await rescheduleBooking({
          appointmentId: booking.id,
          startsAt: slot,
        });
        if (result.status === "slotTaken") {
          setTaken(slot);
          availability.refresh();
        } else {
          setToast(result.toast);
        }
      } catch (error) {
        setToast(unexpectedToast(error));
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex flex-1 flex-col gap-3 px-4 pt-2 pb-6">
        <div className="-ml-2.5 flex min-h-12 items-center gap-1">
          <Link
            href={booking.href}
            aria-label={t("back")}
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <ChevronLeftIcon aria-hidden className="size-5" />
          </Link>
          <h1 className="font-bold">{t("rescheduleTitle")}</h1>
        </div>

        <p className="rounded-xl bg-card px-3.5 py-3 text-sm text-card-foreground">
          <span className="text-muted-foreground">{t("current")}</span>{" "}
          <s>
            {booking.date}, {booking.time}
          </s>
          <br />
          {booking.service.name} · {booking.master.name}
        </p>
        {booking.needsApproval && (
          <p className="rounded-xl bg-accent p-3 text-sm text-accent-foreground">
            {t("needsApproval")}
          </p>
        )}

        <SlotPicker
          availability={availability}
          timeZone={timeZone}
          taken={taken}
          headingLevel={2}
          onSelectDate={(date) => {
            setTaken(null);
            availability.selectDate(date);
          }}
          onSelectSlot={(slot) => {
            setTaken(null);
            availability.selectSlot(slot);
          }}
        />
      </main>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-border bg-background/95 px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="min-w-0 flex-1 text-sm">
          <div className="text-muted-foreground">{t("newTime")}</div>
          <div className="truncate font-bold">
            {selectedSlot
              ? slotDateTimeLabel(selectedSlot, timeZone, locale)
              : t("pickTime")}
          </div>
        </div>
        <Button
          size="lg"
          disabled={!selectedSlot || pending}
          aria-busy={pending || undefined}
          onClick={submit}
        >
          {t("reschedule")}
        </Button>
      </div>
    </div>
  );
}
