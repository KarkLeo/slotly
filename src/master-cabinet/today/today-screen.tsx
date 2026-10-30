import { SunIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { accent } from "@/components/accent";
import { EmptyState } from "@/components/empty-state";
import { AddActions, AddBookingLink } from "../add-actions";
import { PageHeader } from "../page-header";
import { AwaitingQueue } from "./awaiting-queue";
import { DayFeed } from "./day-feed";
import { TodayCounters } from "./today-counters";
import type { TodayView } from "./view";

export function TodayScreen({ view }: { view: TodayView }) {
  const t = useTranslations("MasterCabinet");

  return (
    <>
      <PageHeader
        title={t("sections.today")}
        subtitle={view.date}
        actions={<AddActions />}
      />
      <div className="flex flex-col gap-5">
        <TodayCounters counts={view.counts} />
        <AwaitingQueue items={view.awaiting} />
        {view.empty ? (
          <EmptyState
            icon={SunIcon}
            title={t.rich("today.empty.title", { accent })}
            text={t("today.empty.text")}
            action={<AddBookingLink />}
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
