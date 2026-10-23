"use client";

import { ClockIcon, TriangleAlertIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { DateStrip } from "@/booking/date-strip";
import {
  cancelDeadline,
  groupSlots,
  nearbySlots,
  slotDateTimeLabel,
  slotTimeLabel,
  zoneLabel,
} from "@/booking/dates";
import { SlotGrid } from "@/booking/slot-grid";
import { useAvailability } from "@/booking/use-availability";
import { accent } from "@/components/accent";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActionToast } from "@/toasts/toast";
import { useActionToast } from "@/toasts/use-action-toast";
import { unexpectedToast } from "@/toasts/with-unexpected-toast";
import { confirmBooking, resendCode, startBooking } from "./booking-actions";
import { fetchAvailableDays, fetchAvailableSlots } from "./booking-api";
import { BookingDialog } from "./booking-dialog";
import { BookingDone, BookingExpired, BookingFailed } from "./booking-result";
import { CodeStep } from "./code-step";
import { ContactStep, type ContactValues } from "./contact-step";
import { Price } from "./text";
import type { ServiceView } from "./view";

type Screen =
  | { kind: "contact"; limitReached?: boolean }
  | {
      kind: "code";
      appointmentId: string;
      email: string;
      resendAt: number;
      invalid?: boolean;
    }
  | { kind: "done"; status: "confirmed" | "awaitingMaster" }
  | { kind: "expired" }
  | { kind: "failed" };

const resendDelay = 60_000;

export function BookingFlow({
  service,
  timeZone,
  horizonDays,
  cancelDeadlineMinutes,
}: {
  service: ServiceView;
  timeZone: string;
  horizonDays: number;
  cancelDeadlineMinutes: number;
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
  const [screen, setScreen] = useState<Screen | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [values, setValues] = useState<ContactValues>();
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<ActionToast>();
  const [taken, setTaken] = useState<string | null>(null);
  // The booking this browser holds, released when the client sends the form again.
  const held = useRef<string | null>(null);
  const lastCode = useRef<{ email: string; resendAt: number } | null>(null);
  const next = useRef<HTMLButtonElement>(null);
  const open = screen !== null;
  useActionToast(toast);

  // The booking steps are a screen of their own: the phone's back gesture closes them instead of leaving the page.
  useEffect(() => {
    if (!open) return;
    const close = () => {
      setScreen(null);
      requestAnimationFrame(() => next.current?.focus());
    };
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, [open]);

  function openBooking() {
    window.history.pushState(null, "", window.location.href);
    setSlot(selectedSlot);
    setTaken(null);
    setScreen({ kind: "contact" });
  }

  function closeBooking({ reloadSlots }: { reloadSlots: boolean }) {
    window.history.back();
    if (reloadSlots) availability.retrySlots();
  }

  async function run<T>(
    action: () => Promise<T>,
    handle: (result: T) => void,
    { failScreen = true } = {},
  ) {
    setPending(true);
    try {
      handle(await action());
    } catch (error) {
      setToast(unexpectedToast(error));
      if (failScreen) setScreen({ kind: "failed" });
    } finally {
      setPending(false);
    }
  }

  function submitContact(contact: ContactValues) {
    if (!slot) return;
    setValues(contact);
    const fresh =
      lastCode.current?.email === contact.email &&
      Date.now() < lastCode.current.resendAt
        ? lastCode.current
        : null;
    void run(
      () =>
        startBooking({
          serviceId: service.id,
          slot,
          ...contact,
          locale,
          replaces: held.current,
          reuseCode: fresh !== null,
        }),
      (result) => {
        if (result.status === "codeSent") {
          held.current = result.appointmentId;
          lastCode.current = fresh ?? {
            email: contact.email,
            resendAt: Date.now() + resendDelay,
          };
          if (result.toast) setToast(result.toast);
          setScreen({
            kind: "code",
            appointmentId: result.appointmentId,
            email: contact.email,
            resendAt: lastCode.current.resendAt,
          });
        } else if (result.status === "slotTaken") {
          held.current = null;
          setTaken(slot);
          closeBooking({ reloadSlots: true });
        } else if (result.status === "limitReached") {
          held.current = null;
          setScreen({ kind: "contact", limitReached: true });
        } else {
          setToast(result.toast);
          setScreen(
            result.toast.key === "unexpected"
              ? { kind: "failed" }
              : { kind: "contact" },
          );
        }
      },
    );
  }

  function submitCode(code: string) {
    if (screen?.kind !== "code") return;
    const current = screen;
    void run(
      () =>
        confirmBooking({
          appointmentId: current.appointmentId,
          email: current.email,
          code,
        }),
      (result) => {
        if (result.status === "invalidCode") {
          setScreen({ ...current, invalid: true });
        } else if (result.status === "expired") {
          held.current = null;
          setScreen({ kind: "expired" });
        } else if (result.status === "failed") {
          setToast(result.toast);
        } else {
          held.current = null;
          setToast(result.toast);
          setScreen({ kind: "done", status: result.status });
        }
      },
    );
  }

  function resend() {
    if (screen?.kind !== "code") return;
    const current = screen;
    void run(
      () =>
        resendCode({
          appointmentId: current.appointmentId,
          email: current.email,
          locale,
        }),
      (result) => {
        setToast(result.toast);
        if (result.status === "sent") {
          lastCode.current = {
            email: current.email,
            resendAt: Date.now() + resendDelay,
          };
          setScreen({
            ...current,
            invalid: false,
            resendAt: lastCode.current.resendAt,
          });
        }
      },
      { failScreen: false },
    );
  }

  function selectSlot(value: string) {
    setTaken(null);
    availability.selectSlot(value);
  }

  function selectDate(value: string) {
    setTaken(null);
    availability.selectDate(value);
  }

  const when = selectedSlot
    ? slotDateTimeLabel(selectedSlot, timeZone, locale)
    : null;
  const bookingWhen = slot ? slotDateTimeLabel(slot, timeZone, locale) : "";
  const summary = {
    service: service.name,
    when: bookingWhen,
    price: service.price,
  };
  const deadline = slot
    ? cancelDeadline(slot, cancelDeadlineMinutes, new Date())
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
              onSelect={selectDate}
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
                onSelect={selectSlot}
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
            onClick={openBooking}
          >
            {tl("next")}
          </Button>
        </div>
      </div>

      {screen && (
        <BookingDialog
          screen={screen.kind}
          onBack={() =>
            screen.kind === "code"
              ? setScreen({ kind: "contact" })
              : closeBooking({
                  reloadSlots:
                    screen.kind === "done" || screen.kind === "expired",
                })
          }
        >
          {screen.kind === "contact" && (
            <ContactStep
              summary={summary}
              needsAddress={service.format === "at_client"}
              defaultValues={values}
              pending={pending}
              limitReached={screen.limitReached}
              onSubmit={submitContact}
            />
          )}
          {screen.kind === "code" && (
            <CodeStep
              email={screen.email}
              invalid={screen.invalid}
              pending={pending}
              resendAt={screen.resendAt}
              onSubmit={submitCode}
              onResend={resend}
              onChangeEmail={() => setScreen({ kind: "contact" })}
            />
          )}
          {screen.kind === "done" && (
            <BookingDone
              status={screen.status}
              summary={summary}
              cancelUntil={
                deadline && slotDateTimeLabel(deadline, timeZone, locale)
              }
              onClose={() => closeBooking({ reloadSlots: true })}
            />
          )}
          {screen.kind === "expired" && (
            <BookingExpired
              when={bookingWhen}
              onRestart={() => closeBooking({ reloadSlots: true })}
            />
          )}
          {screen.kind === "failed" && values && (
            <BookingFailed
              pending={pending}
              onRetry={() => submitContact(values)}
            />
          )}
        </BookingDialog>
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
