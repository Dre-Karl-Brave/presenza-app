import type { ReactNode } from "react";
import type { ViewStatus } from "@/lib/status";
import { StateView } from "./StateView";

export function ChartCard({
  title,
  description,
  status,
  emptyMessage,
  actions,
  children,
}: {
  title: string;
  description?: string;
  status: ViewStatus;
  emptyMessage?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-[6px] overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-5 py-[13px] border-b border-border">
        <div>
          <div className="text-[13px] font-semibold text-foreground leading-snug">{title}</div>
          {description ? (
            <div className="text-[12px] text-muted-foreground mt-0.5">{description}</div>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="p-5">
        {status === "ready" ? children : <StateView status={status} emptyMessage={emptyMessage} />}
      </div>
    </div>
  );
}
