import { Button } from "@/components/ui/button";

export function ErrorScreen({
  title,
  description,
  retryLabel,
  onRetry,
}: {
  title: string;
  description: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
      <Button className="w-full" onClick={onRetry}>
        {retryLabel}
      </Button>
    </main>
  );
}
