import type { ViewStatus } from "@/lib/status";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-3 min-h-[120px] text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <div
        className="w-[18px] h-[18px] rounded-full border-2 border-border border-t-primary animate-spin shrink-0"
        aria-hidden="true"
      />
      <span className="text-[13px]">{label}</span>
    </div>
  );
}

export function EmptyState({
  title = "No data",
  message = "There is nothing to show for the current filters.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 min-h-[120px] text-center text-muted-foreground px-6">
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      <p className="text-[12px]">{message}</p>
    </div>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1 min-h-[100px] text-center px-6 py-4 rounded-[6px] bg-destructive/8 text-destructive"
      role="alert"
    >
      <p className="text-[13px] font-medium">Could not load data</p>
      {message ? <p className="text-[12px] opacity-80">{message}</p> : null}
    </div>
  );
}

export function StateView({
  status,
  emptyTitle,
  emptyMessage,
}: {
  status: ViewStatus;
  emptyTitle?: string;
  emptyMessage?: string;
}) {
  if (status === "loading") return <LoadingState />;
  if (status === "error") return <ErrorState />;
  if (status === "empty") return <EmptyState title={emptyTitle} message={emptyMessage} />;
  return null;
}
