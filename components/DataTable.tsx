import type { ReactNode } from "react";
import type { ViewStatus } from "@/lib/status";
import { StateView } from "./StateView";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  numeric?: boolean;
  sortable?: boolean;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  status,
  emptyMessage,
  sortBy,
  sortDir,
  onSort,
  compact = false,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  status: ViewStatus;
  emptyMessage?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  compact?: boolean;
}) {
  if (status !== "ready") {
    return <StateView status={status} emptyMessage={emptyMessage} />;
  }

  const cellPy = compact ? "py-[6px]" : "py-2";

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr className="bg-secondary">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-[18px] ${cellPy} text-left font-medium text-muted-foreground text-[11px] uppercase tracking-[0.4px] border-b border-border ${col.numeric ? "text-right font-mono" : ""}`}
                aria-sort={
                  sortBy === col.key
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                {col.sortable && onSort ? (
                  <button
                    type="button"
                    className="font-medium text-muted-foreground uppercase tracking-[0.4px] text-[11px] cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => onSort(col.key)}
                  >
                    {col.header}
                    {sortBy === col.key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey(row)}
              className={`border-b border-[#f0f0f0] dark:border-border hover:bg-secondary transition-colors ${i % 2 === 0 ? "bg-card" : "bg-background"}`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-[18px] ${cellPy} ${col.numeric ? "text-right font-mono text-[12px] text-foreground/80" : "text-foreground"}`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
