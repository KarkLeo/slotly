import { CalendarPlusIcon, ChevronLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Price } from "@/landing/text";
import { CancelDialog } from "./cancel-dialog";
import { StatusPill } from "./status";
import type { BookingView } from "./view";

export function BookingCard({ booking }: { booking: BookingView }) {
  const t = useTranslations("MyBookings");
  const tl = useTranslations("Landing");
  const active =
    booking.status === "confirmed" || booking.status === "awaitingMaster";
  const listHref = active ? "/app/bookings" : "/app/bookings?tab=history";

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex flex-1 flex-col gap-4 px-4 pt-2 pb-6">
        <div className="-ml-2.5 flex min-h-12 items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Link
              href={listHref}
              aria-label={t("back")}
              className={buttonVariants({ variant: "ghost", size: "icon" })}
            >
              <ChevronLeftIcon aria-hidden className="size-5" />
            </Link>
            <span className="font-bold">{t("booking")}</span>
          </div>
          <StatusPill status={booking.status} />
        </div>

        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em]">
            {booking.date}, {booking.time}
          </h1>
          <p className="text-muted-foreground">
            {booking.service.name} · {booking.service.duration}
            {booking.service.price.amount && (
              <>
                {" · "}
                <Price price={booking.service.price} />
              </>
            )}
            {" · "}
            {booking.zone}
          </p>
          {booking.service.format === "online" && (
            <p className="text-muted-foreground">{tl("online")}</p>
          )}
          {booking.address && (
            <p className="text-muted-foreground">
              {t("address", { address: booking.address })}
            </p>
          )}
        </div>

        {booking.waitsUntil && (
          <p className="rounded-xl bg-accent p-3 text-sm text-accent-foreground">
            {t("waits", { date: booking.waitsUntil })}
          </p>
        )}

        <div className="flex items-center gap-3 rounded-2xl bg-card p-3.5 text-card-foreground">
          <Avatar aria-hidden size="lg">
            <AvatarFallback>{booking.master.initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate font-bold">{booking.master.name}</div>
            <a
              href={booking.master.href}
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline dark:text-accent-foreground"
            >
              {t("masterPage")}
            </a>
          </div>
        </div>

        {booking.late && (
          <p className="rounded-xl bg-warning/15 p-3 text-sm">{t("late")}</p>
        )}
        {booking.changeUntil && !booking.canReschedule && (
          <p className="rounded-xl bg-warning/15 p-3 text-sm">
            {t("rescheduleClosed")}
          </p>
        )}
        {booking.changeUntil && (
          <p className="text-sm text-muted-foreground">
            {t("changeUntil", { date: booking.changeUntil })}
          </p>
        )}

        {active && (
          <a
            href={`${booking.href}/calendar`}
            download
            className={buttonVariants({
              variant: "outline",
              className: "self-start",
            })}
          >
            <CalendarPlusIcon aria-hidden />
            {t("addToCalendar")}
          </a>
        )}
        {booking.bookAgainHref && (
          <a
            href={booking.bookAgainHref}
            className={buttonVariants({ className: "self-start" })}
          >
            {t("bookAgain")}
          </a>
        )}
      </main>

      {booking.changeUntil && (
        <div className="sticky bottom-0 flex gap-2 border-t border-border bg-background/95 px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur">
          {booking.canReschedule && (
            <Link
              href={`${booking.href}/reschedule`}
              className={buttonVariants({
                variant: "outline",
                className: "flex-1",
              })}
            >
              {t("reschedule")}
            </Link>
          )}
          <CancelDialog appointmentId={booking.id} />
        </div>
      )}
    </div>
  );
}
