"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useBrowserTimeZone } from "@/booking/browser-time-zone";
import {
  cancelDeadline,
  clientTimeZone,
  slotDateTimeLabel,
  zoneLabel,
} from "@/booking/dates";
import { SlotPicker } from "@/booking/slot-picker";
import { useAvailability } from "@/booking/use-availability";
import { bookingPath } from "@/client-cabinet/view";
import { Button } from "@/components/ui/button";
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
  | {
      kind: "done";
      status: "confirmed" | "awaitingMaster";
      appointmentId: string;
    }
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
  const tl = useTranslations("Landing");
  const locale = useLocale();
  const browserTimeZone = useBrowserTimeZone();
  const fetchDays = useCallback(
    (from: string, to: string, zone: string) =>
      fetchAvailableDays(service.id, from, to, zone),
    [service.id],
  );
  const fetchSlots = useCallback(
    (day: string, zone: string) => fetchAvailableSlots(service.id, day, zone),
    [service.id],
  );
  const availability = useAvailability({
    timeZone,
    clientTimeZone: clientTimeZone(service.format, timeZone, browserTimeZone),
    horizonDays,
    fetchDays,
    fetchSlots,
  });
  const { selectedSlot, timeZone: shownZone } = availability;
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

  function closeBooking({ refresh }: { refresh: boolean }) {
    window.history.back();
    if (refresh) availability.refresh();
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
          timeZone: shownZone,
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
          closeBooking({ refresh: true });
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
          setScreen({
            kind: "done",
            status: result.status,
            appointmentId: current.appointmentId,
          });
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
    ? slotDateTimeLabel(selectedSlot, shownZone, locale)
    : null;
  const bookingWhen = slot ? slotDateTimeLabel(slot, shownZone, locale) : "";
  const summary = {
    service: service.name,
    when: bookingWhen,
    zone: zoneLabel(shownZone, locale),
    price: service.price,
  };
  const deadline = slot
    ? cancelDeadline(slot, cancelDeadlineMinutes, new Date())
    : null;

  return (
    <>
      <SlotPicker
        availability={availability}
        taken={taken}
        onSelectDate={selectDate}
        onSelectSlot={selectSlot}
      />

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
                  refresh: screen.kind === "done" || screen.kind === "expired",
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
              bookingHref={bookingPath(screen.appointmentId)}
              summary={summary}
              cancelUntil={
                deadline && slotDateTimeLabel(deadline, shownZone, locale)
              }
              onClose={() => closeBooking({ refresh: true })}
            />
          )}
          {screen.kind === "expired" && (
            <BookingExpired
              when={bookingWhen}
              onRestart={() => closeBooking({ refresh: true })}
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
