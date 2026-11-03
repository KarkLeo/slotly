"use client";

import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { useBrowserTimeZone } from "@/booking/browser-time-zone";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SheetBody } from "@/components/ui/sheet";
import { useOnline } from "@/lib/use-online";
import { updateTimeZone } from "./actions";
import { SettingsRow } from "./settings-row";
import {
  SettingsFooter,
  SettingsSheet,
  SettingsWarning,
  useSettingsAction,
} from "./settings-sheet";
import {
  canonicalTimeZone,
  searchTimeZones,
  type TimeZoneOption,
} from "./time-zones";

const resultLimit = 50;

export function TimeZoneSheet({
  current,
  timeZones,
}: {
  current: TimeZoneOption;
  timeZones: TimeZoneOption[];
}) {
  const t = useTranslations("MasterCabinet.settings.timeZone");
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <SettingsSheet
      title={t("label")}
      trigger={<SettingsRow label={t("label")} value={current.city} />}
      open={open}
      onOpenChange={setOpen}
    >
      <TimeZoneForm current={current} timeZones={timeZones} onSaved={close} />
    </SettingsSheet>
  );
}

function ZoneOption({
  option,
  title,
  current = false,
}: {
  option: TimeZoneOption;
  title: string;
  current?: boolean;
}) {
  const t = useTranslations("MasterCabinet.settings.timeZone");
  const details = [option.offset, option.region, current && t("current")]
    .filter(Boolean)
    .join(" · ");

  return (
    <Label className="flex min-h-12 items-center justify-between gap-3 border-b py-2 text-base leading-snug font-normal last:border-b-0">
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="wrap-anywhere">{title}</span>
        <span className="text-sm text-muted-foreground wrap-anywhere">
          {details}
        </span>
      </span>
      <RadioGroupItem value={option.id} />
    </Label>
  );
}

function TimeZoneForm({
  current,
  timeZones,
  onSaved,
}: {
  current: TimeZoneOption;
  timeZones: TimeZoneOption[];
  onSaved: () => void;
}) {
  const t = useTranslations("MasterCabinet.settings");
  const online = useOnline();
  const browserZone = useBrowserTimeZone();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(current.id);
  const [, action, pending] = useSettingsAction(updateTimeZone, onSaved, {});

  const phoneId = browserZone && canonicalTimeZone(browserZone);
  const phone =
    phoneId && phoneId !== current.id
      ? timeZones.find((option) => option.id === phoneId)
      : undefined;
  const results = searchTimeZones(timeZones, query)
    .filter((option) => option.id !== current.id && option.id !== phone?.id)
    .slice(0, resultLimit);

  return (
    <form action={action} className="flex min-h-0 flex-col gap-4">
      <div className="relative px-4">
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-7 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("timeZone.search")}
          aria-label={t("timeZone.search")}
          className="pl-9"
        />
      </div>
      <SheetBody>
        <RadioGroup
          value={selected}
          onValueChange={(value) => setSelected(String(value))}
          aria-label={t("timeZone.label")}
          disabled={!online}
          className="gap-0"
        >
          {phone && (
            <ZoneOption
              option={phone}
              title={t("timeZone.phone", { city: phone.city })}
            />
          )}
          <ZoneOption option={current} title={current.city} current />
          {results.map((option) => (
            <ZoneOption key={option.id} option={option} title={option.city} />
          ))}
        </RadioGroup>
        {results.length === 0 && query.trim() && (
          <p className="py-3 text-sm text-muted-foreground">
            {t("timeZone.nothingFound")}
          </p>
        )}
        <input type="hidden" name="timeZone" value={selected} />
      </SheetBody>
      <SettingsFooter
        label={t("save")}
        pending={pending}
        notice={
          selected !== current.id && (
            <SettingsWarning>{t("timeZone.warning")}</SettingsWarning>
          )
        }
      />
    </form>
  );
}
