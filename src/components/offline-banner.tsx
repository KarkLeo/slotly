"use client";

import { WifiOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOnline } from "@/lib/use-online";

export function OfflineBanner() {
  const t = useTranslations("MasterCabinet");
  const online = useOnline();

  return (
    <div role="status" className="sticky top-0 z-30 bg-background">
      {!online && (
        <div className="flex items-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm font-medium text-warning">
          <WifiOffIcon aria-hidden className="size-4 shrink-0" />
          {t("offline")}
        </div>
      )}
    </div>
  );
}
