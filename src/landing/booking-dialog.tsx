"use client";

import { ArrowLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Price } from "./text";
import type { ServiceView } from "./view";

export type BookingSummaryView = {
  service: string;
  when: string;
  price: ServiceView["price"];
};

// The booking steps are one modal screen: the page behind stays out of reach of focus and screen readers.
export function BookingDialog({
  screen,
  onBack,
  children,
}: {
  screen: string;
  onBack: () => void;
  children: ReactNode;
}) {
  const t = useTranslations("Landing");
  const dialog = useRef<HTMLDialogElement>(null);
  const goBack = useEffectEvent(onBack);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    // Chrome closes the dialog itself on a repeated Escape or back gesture; that still means going back one step.
    const reopen = () => {
      element.showModal();
      goBack();
    };
    element.addEventListener("close", reopen);
    return () => {
      element.removeEventListener("close", reopen);
      element.close();
    };
  }, []);

  // Each screen starts at its heading, so a screen reader announces where the client is.
  useEffect(() => {
    dialog.current?.querySelector<HTMLElement>("#booking-title")?.focus();
  }, [screen]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="booking-title"
      onCancel={(event) => {
        event.preventDefault();
        onBack();
      }}
      className="m-0 h-full max-h-none w-full max-w-none overflow-y-auto bg-background p-0 text-foreground backdrop:bg-background"
    >
      {/* A modal dialog sits above the page, so its toasts must live inside it. */}
      <Toaster position="top-center" />
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 pt-2 pb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label={t("back")}
          className="-ml-3"
        >
          <ArrowLeftIcon />
        </Button>
        {children}
      </div>
    </dialog>
  );
}

export function BookingTitle({ children }: { children: ReactNode }) {
  return (
    <h1
      id="booking-title"
      tabIndex={-1}
      className="text-3xl font-extrabold tracking-[-0.03em] outline-none"
    >
      {children}
    </h1>
  );
}

export function BookingSummary({ summary }: { summary: BookingSummaryView }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-card p-4">
      <span className="font-semibold">{summary.service}</span>
      <span className="text-sm text-muted-foreground">
        {summary.when}
        {summary.price.amount && (
          <>
            {" · "}
            <Price price={summary.price} />
          </>
        )}
      </span>
    </div>
  );
}
