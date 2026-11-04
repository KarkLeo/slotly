import { cn } from "cn";
import { ChevronRightIcon } from "lucide-react";
import { type ComponentProps, type ReactNode, useId } from "react";

const rowClass =
  "flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-base";

function RowContent({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <>
      <span className="shrink-0 font-medium">{label}</span>
      <span className="min-w-0 flex-1 text-right text-sm text-muted-foreground wrap-anywhere">
        {value}
      </span>
    </>
  );
}

export function SettingsRow({
  label,
  value,
  className,
  ...props
}: Omit<ComponentProps<"button">, "value"> & {
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        rowClass,
        "outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:pointer-events-none disabled:text-muted-foreground",
        className,
      )}
      {...props}
    >
      <RowContent label={label} value={value} />
      {!props.disabled && (
        <ChevronRightIcon
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
      )}
    </button>
  );
}

export function StaticSettingsRow({
  label,
  value,
}: {
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <div className={rowClass}>
      <RowContent label={label} value={value} />
    </div>
  );
}

export function SettingsGroup({
  title,
  notice,
  children,
}: {
  title: ReactNode;
  notice?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-1.5">
      <h2
        id={id}
        className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase"
      >
        {title}
      </h2>
      {notice}
      <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl bg-card">
        {children}
      </div>
    </section>
  );
}
