import { CalendarIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { accent } from "@/components/accent";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusLine } from "./status";
import type { BookingView } from "./view";

export type BookingsTab = "upcoming" | "history";

export function BookingsList({
  tab,
  bookings,
}: {
  tab: BookingsTab;
  bookings: BookingView[];
}) {
  const t = useTranslations("MyBookings");
  const tabs = [
    { value: "upcoming", href: "/app/bookings" },
    { value: "history", href: "/app/bookings?tab=history" },
  ] as const;

  return (
    <main className="flex flex-col gap-4 px-4 pt-2 pb-8">
      <h1 className="text-3xl font-extrabold tracking-[-0.03em]">
        {t.rich("title", { accent })}
      </h1>
      <nav className="flex gap-1 rounded-xl bg-muted p-1">
        {tabs.map((item) => (
          <Link
            key={item.value}
            href={item.href}
            aria-current={item.value === tab ? "page" : undefined}
            className="flex min-h-10 flex-1 items-center justify-center rounded-lg text-sm font-semibold text-muted-foreground outline-none hover:bg-background/60 focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-xs"
          >
            {t(item.value)}
          </Link>
        ))}
      </nav>

      {bookings.length === 0 && tab === "upcoming" && (
        <div className="flex flex-col items-center gap-2.5 px-3 py-12 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-card text-muted-foreground">
            <CalendarIcon aria-hidden className="size-7" />
          </span>
          <h2 className="text-xl font-extrabold tracking-[-0.02em]">
            {t.rich("emptyTitle", { accent })}
          </h2>
          <p className="max-w-64 text-sm text-muted-foreground">
            {t("emptyText")}
          </p>
        </div>
      )}
      {bookings.length === 0 && tab === "history" && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {t("emptyHistory")}
        </p>
      )}

      {bookings.length > 0 && (
        <ul className="flex flex-col gap-3">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <Link
                href={booking.href}
                className="flex flex-col gap-2.5 rounded-2xl bg-card p-3.5 text-card-foreground outline-none hover:bg-card/80 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex items-baseline justify-between gap-2 font-bold">
                  <span>{booking.date}</span>
                  <span className="whitespace-nowrap">{booking.time}</span>
                </span>
                <span className="flex min-w-0 items-center gap-2.5">
                  <Avatar aria-hidden size="lg">
                    <AvatarFallback>{booking.master.initials}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {booking.master.name}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {booking.service.name} · {booking.service.duration}
                    </span>
                  </span>
                </span>
                <StatusLine status={booking.status} late={booking.late} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
