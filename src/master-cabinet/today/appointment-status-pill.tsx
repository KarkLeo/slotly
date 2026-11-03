import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";
import { Badge } from "@/components/ui/badge";
import type { AppointmentStatus } from "./view";

const variants: Record<
  AppointmentStatus,
  ComponentProps<typeof Badge>["variant"]
> = {
  awaitingMaster: "accent",
  confirmed: "success",
  now: "default",
  completed: "muted",
  noShow: "warning",
};

export function AppointmentStatusPill({
  status,
  className,
}: {
  status: AppointmentStatus;
  className?: string;
}) {
  const t = useTranslations("MasterCabinet.today.badges");
  return (
    <Badge variant={variants[status]} size="status" className={className}>
      {t(status)}
    </Badge>
  );
}
