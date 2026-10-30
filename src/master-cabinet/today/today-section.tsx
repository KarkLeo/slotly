import { type ReactNode, useId } from "react";

export function TodaySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2.5">
      <h2 id={titleId} className="text-base font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}
