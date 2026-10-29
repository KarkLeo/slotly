"use client";

import { CalendarPlusIcon, ClockIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { accent } from "@/components/accent";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  BookingSummary,
  BookingTitle,
  type BookingSummaryView,
} from "./booking-dialog";

export function BookingDone({
  status,
  bookingHref,
  summary,
  cancelUntil,
  onClose,
}: {
  status: "confirmed" | "awaitingMaster";
  bookingHref: string;
  summary: BookingSummaryView;
  cancelUntil: string | null;
  onClose: () => void;
}) {
  const t = useTranslations("Landing");
  return (
    <>
      <BookingTitle>
        {status === "confirmed"
          ? t.rich("doneTitle", { accent })
          : t.rich("requestedTitle", { accent })}
      </BookingTitle>
      {status === "awaitingMaster" && (
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2 font-semibold">
            <ClockIcon aria-hidden className="size-4 text-warning" />
            {t("awaitingMaster")}
          </span>
          <span className="text-muted-foreground">{t("awaitingText")}</span>
        </div>
      )}
      <BookingSummary summary={summary} />
      <p className="text-sm text-muted-foreground">
        {cancelUntil
          ? t("cancelUntil", { date: cancelUntil })
          : t("cancelClosed")}
      </p>
      <a
        href={`${bookingHref}/calendar`}
        download
        className={buttonVariants({ variant: "outline" })}
      >
        <CalendarPlusIcon aria-hidden />
        {t("addToCalendar")}
      </a>
      <Button size="lg" onClick={onClose}>
        {t("close")}
      </Button>
      <Link
        href="/app/bookings"
        prefetch={false}
        className={buttonVariants({
          variant: "link",
          className: "self-center",
        })}
      >
        {t("myBookings")}
      </Link>
    </>
  );
}

export function BookingExpired({
  when,
  onRestart,
}: {
  when: string;
  onRestart: () => void;
}) {
  const t = useTranslations("Landing");
  return (
    <>
      <BookingTitle>{t.rich("expiredTitle", { accent })}</BookingTitle>
      <p className="text-muted-foreground">{t("expiredText", { when })}</p>
      <Button size="lg" onClick={onRestart}>
        {t("chooseAgain")}
      </Button>
    </>
  );
}

export function BookingFailed({
  pending = false,
  onRetry,
}: {
  pending?: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations("Landing");
  return (
    <>
      <BookingTitle>{t.rich("failedTitle", { accent })}</BookingTitle>
      <p className="text-muted-foreground">{t("failedText")}</p>
      <Button
        size="lg"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={onRetry}
      >
        {t("tryAgain")}
      </Button>
    </>
  );
}
