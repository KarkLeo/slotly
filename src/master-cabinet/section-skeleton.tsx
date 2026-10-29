import { Skeleton } from "@/components/ui/skeleton";

export function SectionSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4 px-4 pt-2 pb-8">
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  );
}
