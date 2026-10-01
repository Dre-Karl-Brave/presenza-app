import type { ReactNode } from "react";
import type { ViewStatus } from "@/lib/status";
import { StateView } from "./StateView";

export function ChartCard({
  title,
  description,
  status,
  emptyMessage,
  children,
}: {
  title: string;
  description?: string;
  status: ViewStatus;
  emptyMessage?: string;
  children: ReactNode;
}) {
  return (
    <section className="card">
      <h2 className="card__title">{title}</h2>
      {description ? <p className="card__description">{description}</p> : null}
      <div className="card__body">
        {status === "ready" ? children : <StateView status={status} emptyMessage={emptyMessage} />}
      </div>
    </section>
  );
}
