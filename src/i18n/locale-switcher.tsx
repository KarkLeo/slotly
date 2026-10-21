"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setLocale } from "./actions";
import { locales } from "./locales";

export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const items = locales.map((option) => ({ value: option, label: t(option) }));

  return (
    <div className="flex items-center gap-3">
      <Label id="locale-label">{t("label")}</Label>
      <Select
        items={items}
        value={locale}
        disabled={isPending}
        onValueChange={(next) => {
          if (next) startTransition(() => setLocale(next));
        }}
      >
        <SelectTrigger aria-labelledby="locale-label" className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
