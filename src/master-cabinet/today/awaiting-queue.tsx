import { useTranslations } from "next-intl";
import { useId } from "react";
import { AwaitingCard } from "./awaiting-card";
import { DecisionActions } from "./decision-actions";
import { TodaySection } from "./today-section";
import type { AwaitingView } from "./view";

function AwaitingItem({ item }: { item: AwaitingView }) {
  const subjectId = useId();

  return (
    <li>
      <AwaitingCard
        item={item}
        describedById={subjectId}
        actions={
          <DecisionActions appointmentId={item.id} describedBy={subjectId} />
        }
      />
    </li>
  );
}

export function AwaitingQueue({ items }: { items: AwaitingView[] }) {
  const t = useTranslations("MasterCabinet.today");
  if (items.length === 0) return null;

  return (
    <TodaySection title={t("awaitingTitle")}>
      <ul className="flex flex-col gap-2.5">
        {items.map((item) => (
          <AwaitingItem key={item.id} item={item} />
        ))}
      </ul>
    </TodaySection>
  );
}
