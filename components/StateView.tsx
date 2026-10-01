import type { ViewStatus } from "@/lib/status";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({
  title = "No data yet",
  message = "There is nothing to show for the current filters.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="state">
      <p className="state__title">{title}</p>
      <p>{message}</p>
    </div>
  );
}

export function ErrorState({ message = "Something went wrong while loading this data." }: { message?: string }) {
  return (
    <div className="state state--error" role="alert">
      <p className="state__title">Could not load data</p>
      <p>{message}</p>
    </div>
  );
}

// Renders the placeholder for any status except "ready" (returns null then).
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
