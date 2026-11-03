import { cn } from "cn";
import { AppointmentStatusPill } from "./appointment-status-pill";
import { MetaText } from "./meta-text";
import type { RowView } from "./view";

export function AppointmentRow({
  row,
}: {
  row: Extract<RowView, { kind: "appointment" }>;
}) {
  const dimmed = row.finished && "text-muted-foreground";

  return (
    <div className="flex gap-3 px-2 py-3">
      <span
        className={cn("min-w-12 shrink-0 font-bold whitespace-nowrap", dimmed)}
      >
        {row.time}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block font-semibold break-words", dimmed)}>
          {row.clientName}
        </span>
        <span className="block text-sm break-words text-muted-foreground">
          <MetaText parts={[row.service, row.duration]} />
        </span>
      </span>
      <AppointmentStatusPill status={row.status} className="self-center" />
    </div>
  );
}
