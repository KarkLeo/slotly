"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/locales";
import type { LocalAppointment } from "./conflicts";
import { appointmentLine } from "./view";

export function OutsideWarning({
  appointments,
  text,
}: {
  appointments: LocalAppointment[];
  text: "outside" | "afterDelete";
}) {
  const t = useTranslations("MasterCabinet.schedule.outside");
  const locale = useLocale() as Locale;
  if (appointments.length === 0) return null;

  return (
    <div className="rounded-lg bg-warning-bg p-3 text-sm text-warning wrap-anywhere">
      {t(text, { count: appointments.length })}
      <ul className="mt-2 flex flex-col gap-1">
        {appointments.map((appointment) => (
          <li key={appointment.id}>{appointmentLine(appointment, locale)}</li>
        ))}
      </ul>
    </div>
  );
}
