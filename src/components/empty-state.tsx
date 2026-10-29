import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: ReactNode;
  text: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-3 py-12 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-card text-muted-foreground">
        <Icon aria-hidden className="size-7" />
      </span>
      <h2 className="text-xl font-extrabold tracking-[-0.02em]">{title}</h2>
      <p className="max-w-64 text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}
