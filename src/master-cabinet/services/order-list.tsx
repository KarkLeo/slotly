"use client";

import { cn } from "cn";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useOnline } from "@/lib/use-online";
import { unexpectedToast } from "@/toasts/with-unexpected-toast";
import type { ReorderResult } from "./actions";

// The order shows at once, so only a failure gets a toast. Edge buttons stay focusable: a disabled one would drop focus.
export function OrderList<T extends { id: string; title: string }>({
  items,
  save,
  className,
  children,
}: {
  items: T[];
  save: (ids: string[]) => Promise<ReorderResult>;
  className?: string;
  children: (item: T) => ReactNode;
}) {
  const t = useTranslations("MasterCabinet.services.order");
  const toasts = useTranslations("Toasts");
  const online = useOnline();
  const [ordered, setOrdered] = useOptimistic(items);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState("");

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (pending || !online || target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    setStatus(
      t("moved", {
        name: ordered[index].title,
        position: target + 1,
        total: ordered.length,
      }),
    );
    startTransition(async () => {
      setOrdered(next);
      try {
        const { toast: shown } = await save(next.map((item) => item.id));
        if (shown) toast[shown.type](toasts(shown.key));
      } catch (error) {
        toast.error(toasts(unexpectedToast(error).key));
      }
    });
  }

  return (
    <>
      <ul className={cn("flex flex-col divide-y divide-border", className)}>
        {ordered.map((item, index) => (
          <li key={item.id} className="flex min-h-12 items-center gap-1 py-0.5">
            <div className="min-w-0 flex-1">{children(item)}</div>
            {ordered.length > 1 && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("up", { name: item.title })}
                  aria-disabled={index === 0 || !online}
                  className="aria-disabled:opacity-40"
                  onClick={() => move(index, -1)}
                >
                  <ArrowUpIcon aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("down", { name: item.title })}
                  aria-disabled={index === ordered.length - 1 || !online}
                  className="aria-disabled:opacity-40"
                  onClick={() => move(index, 1)}
                >
                  <ArrowDownIcon aria-hidden />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
      <p role="status" className="sr-only">
        {status}
      </p>
    </>
  );
}
