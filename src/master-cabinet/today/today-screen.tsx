"use client";

import { cn } from "cn";
import { SunIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useId } from "react";
import { accent } from "@/components/accent";
import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { useRefreshOnVisible } from "@/lib/use-refresh-on-visible";
import type { Theme } from "@/theme/theme";
import { AddActions, PageHeader } from "../page-header";
import { newBookingHref } from "../sections";
import { AwaitingCard } from "./awaiting-card";
import { DayFeed } from "./day-feed";
import type { TodayView } from "./view";

function Counters({ counts }: { counts: TodayView["counts"] }) {
  const t = useTranslations("MasterCabinet.today.counters");
  const tiles = [
    { key: "today", value: counts.today, className: "bg-card" },
    { key: "tomorrow", value: counts.tomorrow, className: "bg-card" },
    {
      key: "awaiting",
      value: counts.awaiting,
      className: "bg-accent text-accent-foreground",
    },
  ] as const;

  return (
    <dl className="grid grid-cols-3 gap-2">
      {tiles.map((tile) => (
        <div
          key={tile.key}
          className={cn(
            "flex min-w-0 flex-col rounded-[14px] px-3 py-2.5",
            tile.className,
          )}
        >
          <dt
            className={cn(
              "text-[13px] break-words",
              tile.key !== "awaiting" && "text-muted-foreground",
            )}
          >
            {t(tile.key)}
          </dt>
          <dd className="order-first text-[22px] font-extrabold">
            {tile.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// theme and email keep the signature of the other cabinet sections; Today has no back button that needs them.
export function TodayScreen({
  view,
}: {
  view: TodayView;
  theme: Theme;
  email: string | null;
}) {
  const t = useTranslations("MasterCabinet");
  const queueId = useId();
  useRefreshOnVisible();

  const empty =
    view.awaiting.length === 0 &&
    view.today.length === 0 &&
    view.tomorrow.length === 0;

  return (
    <>
      <PageHeader
        title={t("sections.today")}
        subtitle={
          <span className="inline-block first-letter:uppercase">
            {view.date}
          </span>
        }
        actions={<AddActions />}
      />
      <div className="flex flex-col gap-5">
        <Counters counts={view.counts} />
        {view.awaiting.length > 0 && (
          <section aria-labelledby={queueId} className="flex flex-col gap-2.5">
            <h2 id={queueId} className="text-base font-bold">
              {t("today.awaitingTitle")}
            </h2>
            <ul className="flex flex-col gap-2.5">
              {view.awaiting.map((item) => (
                <li key={item.id}>
                  <AwaitingCard item={item} />
                </li>
              ))}
            </ul>
          </section>
        )}
        {empty ? (
          <EmptyState
            icon={SunIcon}
            title={t.rich("today.empty.title", { accent })}
            text={t("today.empty.text")}
            action={
              <Link href={newBookingHref} className={buttonVariants()}>
                {t("add.booking")}
              </Link>
            }
          />
        ) : (
          <>
            <DayFeed title={t("today.todayTitle")} rows={view.today} />
            <DayFeed title={t("today.tomorrowTitle")} rows={view.tomorrow} />
          </>
        )}
      </div>
    </>
  );
}
