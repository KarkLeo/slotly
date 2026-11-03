import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { MetaText } from "./meta-text";
import type { AwaitingView } from "./view";

export function AwaitingCard({
  item,
  describedById,
  actions,
}: {
  item: AwaitingView;
  describedById: string;
  actions: ReactNode;
}) {
  const t = useTranslations("MasterCabinet.today");

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-dashed border-primary bg-card p-3.5">
      <div id={describedById} className="min-w-0">
        <p className="font-bold break-words">{item.clientName}</p>
        <p className="text-sm break-words text-muted-foreground">
          <MetaText parts={[item.service, t("when", item.when)]} />
        </p>
      </div>
      <p className="text-[13px] font-semibold text-warning">
        {t("answerBy", item.answerBy)}
      </p>
      {actions}
    </div>
  );
}
