import { cn } from "cn";
import { useTranslations } from "next-intl";
import type { BookingStatusView } from "./view";

const dots: Record<BookingStatusView, string> = {
  confirmed: "bg-success",
  awaitingMaster: "bg-primary",
  completed: "bg-input",
  cancelled: "bg-input",
};

const texts: Record<BookingStatusView, string> = {
  confirmed: "text-success",
  awaitingMaster: "text-foreground",
  completed: "text-muted-foreground",
  cancelled: "text-muted-foreground",
};

const pills: Record<BookingStatusView, string> = {
  confirmed: "bg-success/15 text-success",
  awaitingMaster: "bg-accent text-accent-foreground",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

export function StatusLine({
  status,
  late,
}: {
  status: BookingStatusView;
  late: boolean;
}) {
  const t = useTranslations("MyBookings");
  return (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <span
        aria-hidden
        className={cn("size-2 shrink-0 rounded-full", dots[status])}
      />
      <span>
        <span className={cn("font-semibold", texts[status])}>{t(status)}</span>
        {late && ` · ${t("lateHint")}`}
      </span>
    </span>
  );
}

export function StatusPill({ status }: { status: BookingStatusView }) {
  const t = useTranslations("MyBookings");
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        pills[status],
      )}
    >
      {t(status === "awaitingMaster" ? "awaitingMasterLong" : status)}
    </span>
  );
}
