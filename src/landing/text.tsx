import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { ServiceView } from "./view";

export function accent(chunks: ReactNode) {
  return (
    <span className="font-accent text-[1.15em] font-medium tracking-normal italic">
      {chunks}
    </span>
  );
}

export function Price({ price }: { price: ServiceView["price"] }) {
  const t = useTranslations("Landing");
  if (price.amount === null) return null;
  return price.kind === "from"
    ? t("priceFrom", { price: price.amount })
    : price.amount;
}
