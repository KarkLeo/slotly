"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { SettingsRow } from "../settings/settings-row";
import { ExceptionSheet } from "./exception-sheet";
import { intervalsLabel } from "./hours";
import type { ScheduleView } from "./view";

export function ExceptionRows({ view }: { view: ScheduleView }) {
  const t = useTranslations("MasterCabinet.schedule");

  return (
    <>
      {view.periods.map((period) => {
        const what =
          period.hours.length > 0
            ? intervalsLabel(period.hours)
            : period.length === 1
              ? t("dayOff")
              : t("exceptions.offRange", { count: period.length });
        return (
          <ExceptionSheet
            key={period.from}
            view={view}
            period={period}
            trigger={
              <SettingsRow
                label={period.dates}
                value={
                  <>
                    {what}
                    {period.outsideCount > 0 && (
                      <span className="mt-0.5 flex justify-end">
                        <Badge variant="warning">
                          {t("exceptions.outsideBadge", {
                            count: period.outsideCount,
                          })}
                        </Badge>
                      </span>
                    )}
                  </>
                }
              />
            }
          />
        );
      })}
      <ExceptionSheet
        view={view}
        period={null}
        trigger={
          <button
            type="button"
            className="flex min-h-12 w-full items-center justify-center px-4 py-3 text-base font-semibold outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            {t("exceptions.add")}
          </button>
        }
      />
    </>
  );
}
