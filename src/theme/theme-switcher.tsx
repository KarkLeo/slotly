"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { unexpectedToast } from "@/toasts/with-unexpected-toast";
import { setTheme } from "./actions";
import { isTheme, type Theme, themes } from "./theme";

const icons = { system: MonitorIcon, light: SunIcon, dark: MoonIcon };

export function ThemeSwitcher({ theme }: { theme: Theme }) {
  const t = useTranslations("ThemeSwitcher");
  const toasts = useTranslations("Toasts");
  const labelId = useId();
  const [shown, setShown] = useOptimistic(theme);
  const [, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <span id={labelId} className="text-sm font-medium select-none">
        {t("label")}
      </span>
      <ToggleGroup
        aria-labelledby={labelId}
        value={[shown]}
        onValueChange={([next]) => {
          if (!isTheme(next)) return;
          startTransition(async () => {
            setShown(next);
            try {
              await setTheme(next);
            } catch (error) {
              toast.error(toasts(unexpectedToast(error).key));
            }
          });
        }}
        className="gap-1 rounded-xl bg-muted p-1"
      >
        {themes.map((option) => {
          const Icon = icons[option];
          return (
            <ToggleGroupItem
              key={option}
              value={option}
              aria-label={t(option)}
              className="text-muted-foreground hover:bg-background/60 aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-xs"
            >
              <Icon />
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
