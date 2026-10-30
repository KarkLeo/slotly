"use client";

import { cn } from "cn";
import { useTranslations } from "next-intl";
import { useId } from "react";
import type { Badge, RowView } from "./view";

// Pills sit on the card; colored text needs the page background behind it to keep its contrast.
const pills: Record<Badge, string> = {
  awaitingMaster: "bg-accent text-accent-foreground",
  confirmed: "bg-background text-success",
  now: "bg-primary text-primary-foreground",
  completed: "bg-muted text-muted-foreground",
  noShow: "bg-background text-warning",
};

function Row({ row }: { row: RowView }) {
  const t = useTranslations("MasterCabinet.today");

  if (row.kind === "block") {
    return (
      <div className="my-1 flex gap-3 rounded-[10px] bg-hatch px-2.5 py-2 text-sm text-muted-foreground">
        <span className="shrink-0 font-bold">{row.time ?? t("allDay")}</span>
        <span className="min-w-0 break-words">
          {t("block")}
          {row.note && ` · ${row.note}`}
        </span>
      </div>
    );
  }

  return (
    <div className="flex gap-3 px-2 py-3">
      <span
        className={cn(
          "min-w-12 shrink-0 font-bold whitespace-nowrap",
          row.muted && "text-muted-foreground",
        )}
      >
        {row.time}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block font-semibold break-words",
            row.muted && "text-muted-foreground",
          )}
        >
          {row.clientName}
        </span>
        <span className="block text-sm break-words text-muted-foreground">
          {row.detail}
        </span>
      </span>
      <span
        className={cn(
          "self-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
          pills[row.badge],
        )}
      >
        {t(`badges.${row.badge}`)}
      </span>
    </div>
  );
}

export function DayFeed({ title, rows }: { title: string; rows: RowView[] }) {
  const t = useTranslations("MasterCabinet.today");
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2.5">
      <h2 id={titleId} className="text-base font-bold">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-card px-3.5 py-3 text-sm text-muted-foreground">
          {t("nothingPlanned")}
        </p>
      ) : (
        <ul className="flex flex-col rounded-2xl bg-card px-1.5 py-1">
          {rows.map((row) => (
            <li key={row.id}>
              <Row row={row} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
