import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { Theme } from "@/theme/theme";
import { PageHeader } from "../page-header";
import { CurrencySheet } from "./currency-sheet";
import { LocalesSheet } from "./locales-sheet";
import { NameSheet } from "./name-sheet";
import { PublicationSheet } from "./publication-sheet";
import { SettingsGroup, SettingsRow } from "./settings-row";
import { SlugSheet } from "./slug-sheet";
import { TimeZoneSheet } from "./time-zone-sheet";
import type { TimeZoneOption } from "./time-zones";
import type { SettingsView } from "./view";

export function SettingsScreen({
  view,
  timeZones,
  siteHost,
  theme,
  email,
}: {
  view: SettingsView;
  timeZones: readonly TimeZoneOption[];
  siteHost: string;
  theme: Theme;
  email: string | null;
}) {
  const t = useTranslations("MasterCabinet");

  return (
    <>
      <PageHeader title={t("sections.settings")} back={{ theme, email }} />
      <div className="flex flex-col gap-5">
        <SettingsGroup title={t("settings.groups.profile")}>
          <NameSheet name={view.name} />
          <SlugSheet view={view} siteHost={siteHost} />
        </SettingsGroup>
        <SettingsGroup title={t("settings.groups.page")}>
          <LocalesSheet view={view} />
          <PublicationSheet publication={view.publication} slug={view.slug} />
        </SettingsGroup>
        <SettingsGroup title={t("settings.groups.timeAndMoney")}>
          <TimeZoneSheet current={view.timeZone} timeZones={timeZones} />
          <CurrencySheet currency={view.currency} />
        </SettingsGroup>
        <SettingsGroup title={t("settings.groups.contact")}>
          <SettingsRow
            label={t("settings.telegram")}
            value={<Badge variant="muted">{t("settings.soon")}</Badge>}
            disabled
          />
        </SettingsGroup>
      </div>
    </>
  );
}
