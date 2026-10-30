import { cn } from "cn";
import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";
import { Badge } from "@/components/ui/badge";
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

const pills: Record<
  BookingStatusView,
  ComponentProps<typeof Badge>["variant"]
> = {
  confirmed: "success",
  awaitingMaster: "accent",
  completed: "muted",
  cancelled: "muted",
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
    <Badge variant={pills[status]} size="status">
      {t(status === "awaitingMaster" ? "awaitingMasterLong" : status)}
    </Badge>
  );
}
