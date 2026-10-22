import type { Database } from "@/db/types";
import type { LocalizedText } from "./localize";

export type Category = {
  id: string;
  position: number;
  name: LocalizedText;
};

export type Service = {
  id: string;
  categoryId: string | null;
  position: number;
  name: LocalizedText;
  description: LocalizedText;
  durationMinutes: number;
  priceKind: Database["public"]["Enums"]["price_kind"];
  price: number | null;
  format: Database["public"]["Enums"]["service_format"];
};

export type ServiceGroup = {
  category: Category | null;
  services: Service[];
};

const byPosition = (a: { position: number }, b: { position: number }) =>
  a.position - b.position;

export function groupServices(
  categories: Category[],
  services: Service[],
): ServiceGroup[] {
  const sorted = [...services].sort(byPosition);
  const groups: ServiceGroup[] = [...categories]
    .sort(byPosition)
    .map((category) => ({
      category,
      services: sorted.filter((s) => s.categoryId === category.id),
    }));
  const known = new Set(categories.map((category) => category.id));
  groups.push({
    category: null,
    services: sorted.filter((s) => !s.categoryId || !known.has(s.categoryId)),
  });
  return groups.filter((group) => group.services.length > 0);
}
