import { useTranslations } from "next-intl";
import type { ServiceView } from "./view";

export function Price({ price }: { price: ServiceView["price"] }) {
  const t = useTranslations("Landing");
  if (price.amount === null) return null;
  return price.kind === "from"
    ? t("priceFrom", { price: price.amount })
    : price.amount;
}
