"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectFieldLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { unexpectedToast } from "@/toasts/with-unexpected-toast";
import { setLocale } from "./actions";
import { locales } from "./locales";

export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const toasts = useTranslations("Toasts");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const items = locales.map((option) => ({ value: option, label: t(option) }));

  return (
    <Select
      items={items}
      value={locale}
      disabled={isPending}
      onValueChange={(next) => {
        if (!next) return;
        startTransition(async () => {
          try {
            await setLocale(next);
          } catch (error) {
            toast.error(toasts(unexpectedToast(error).key));
          }
        });
      }}
    >
      <div className="flex items-center gap-3">
        <SelectFieldLabel>{t("label")}</SelectFieldLabel>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
      </div>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
