"use client";

import { useTranslations } from "next-intl";
import {
  type ReactElement,
  type ReactNode,
  useActionState,
  useCallback,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useOnline } from "@/lib/use-online";
import { useShownToastAction } from "@/toasts/use-shown-toast-action";
import type { ActionToast } from "@/toasts/toast";

export const optionRowClass =
  "flex min-h-12 items-center justify-between gap-3 border-b py-2 text-base leading-snug font-normal last:border-b-0";

export function SettingsSheet({
  title,
  trigger,
  open,
  onOpenChange,
  children,
}: {
  title: ReactNode;
  trigger: ReactElement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger render={trigger} />
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle className="text-lg font-extrabold">{title}</SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}

// Shows the toast as the action resolves and closes the sheet on success.
export function useSettingsAction<S extends { toast?: ActionToast }>(
  action: (state: S, formData: FormData) => Promise<S>,
  onSaved: () => void,
  initialState: Awaited<S>,
) {
  const closing = useCallback(
    async (state: S, formData: FormData) => {
      const next = await action(state, formData);
      if (next.toast?.type === "success") onSaved();
      return next;
    },
    [action, onSaved],
  );
  return useActionState<S, FormData>(
    useShownToastAction(closing),
    initialState,
  );
}

export function SettingsWarning({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg bg-warning-bg p-3 text-sm text-warning wrap-anywhere">
      {children}
    </p>
  );
}

export function SettingsFooter({
  label,
  pending,
  disabled = false,
  variant = "default",
  cancelLabel,
  notice,
}: {
  label: string;
  pending: boolean;
  disabled?: boolean;
  variant?: "default" | "destructive";
  cancelLabel?: string;
  notice?: ReactNode;
}) {
  const t = useTranslations("MasterCabinet");
  const online = useOnline();

  return (
    <div className="flex flex-col gap-2 px-4">
      {notice}
      {!online && <p className="text-sm text-destructive">{t("offline")}</p>}
      <Button
        type="submit"
        variant={variant}
        disabled={!online || disabled}
        loading={pending}
      >
        {label}
      </Button>
      {cancelLabel && (
        <SheetClose disabled={pending} render={<Button variant="outline" />}>
          {cancelLabel}
        </SheetClose>
      )}
    </div>
  );
}
