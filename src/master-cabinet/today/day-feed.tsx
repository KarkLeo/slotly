import { useTranslations } from "next-intl";
import { AppointmentRow } from "./appointment-row";
import { BlockRow } from "./block-row";
import { TodaySection } from "./today-section";
import type { RowView } from "./view";

function FeedNote() {
  const t = useTranslations("MasterCabinet.today");

  return (
    <p className="rounded-2xl bg-card px-3.5 py-3 text-sm text-muted-foreground">
      {t("nothingPlanned")}
    </p>
  );
}

export function DayFeed({ title, rows }: { title: string; rows: RowView[] }) {
  return (
    <TodaySection title={title}>
      {rows.length === 0 ? (
        <FeedNote />
      ) : (
        <ul className="flex flex-col rounded-2xl bg-card px-1.5 py-1">
          {rows.map((row) => (
            <li key={row.id}>
              {row.kind === "block" ? (
                <BlockRow row={row} />
              ) : (
                <AppointmentRow row={row} />
              )}
            </li>
          ))}
        </ul>
      )}
    </TodaySection>
  );
}
