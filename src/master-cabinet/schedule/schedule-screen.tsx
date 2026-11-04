import { useTranslations } from "next-intl";
import type { Theme } from "@/theme/theme";
import { PageHeader } from "../page-header";
import { SettingsGroup } from "../settings/settings-row";
import { SettingsWarning } from "../settings/settings-sheet";
import { DaySheet } from "./day-sheet";
import type { ScheduleView } from "./view";

export function ScheduleScreen({
  view,
  theme,
  email,
}: {
  view: ScheduleView;
  theme: Theme;
  email: string | null;
}) {
  const t = useTranslations("MasterCabinet");

  return (
    <>
      <PageHeader title={t("sections.schedule")} back={{ theme, email }} />
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <SettingsGroup
            title={t("schedule.groups.template")}
            notice={
              view.templateEmpty && (
                <SettingsWarning>{t("schedule.emptyTemplate")}</SettingsWarning>
              )
            }
          >
            {view.days.map((day) => (
              <DaySheet key={day.weekday} view={view} day={day} />
            ))}
          </SettingsGroup>
          <p className="px-1 text-sm text-muted-foreground">
            {t("schedule.zoneNote", { zone: view.zone })}
          </p>
        </div>
      </div>
    </>
  );
}
