import { useTranslations } from "next-intl";
import { MetaText } from "./meta-text";
import type { RowView } from "./view";

export function BlockRow({
  row,
}: {
  row: Extract<RowView, { kind: "block" }>;
}) {
  const t = useTranslations("MasterCabinet.today");

  return (
    <div className="my-1 flex gap-3 rounded-[10px] bg-hatch px-2.5 py-2 text-sm text-muted-foreground">
      <span className="shrink-0 font-bold">{row.time ?? t("allDay")}</span>
      <span className="min-w-0 break-words">
        <MetaText parts={[t("block"), row.note]} />
      </span>
    </div>
  );
}
