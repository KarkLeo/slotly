import { cn } from "cn";
import { useTranslations } from "next-intl";
import type { TodayView } from "./view";

function CounterTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "accent";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col rounded-[14px] px-3 py-2.5",
        tone === "accent" ? "bg-accent text-accent-foreground" : "bg-card",
      )}
    >
      <dt
        className={cn(
          "text-[13px] break-words",
          tone === "default" && "text-muted-foreground",
        )}
      >
        {label}
      </dt>
      <dd className="order-first text-[22px] font-extrabold">{value}</dd>
    </div>
  );
}

export function TodayCounters({ counts }: { counts: TodayView["counts"] }) {
  const t = useTranslations("MasterCabinet.today.counters");

  return (
    <dl className="grid grid-cols-3 gap-2">
      <CounterTile label={t("today")} value={counts.today} tone="default" />
      <CounterTile
        label={t("tomorrow")}
        value={counts.tomorrow}
        tone="default"
      />
      <CounterTile
        label={t("awaiting")}
        value={counts.awaiting}
        tone="accent"
      />
    </dl>
  );
}
