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
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  status: ViewStatus;
  emptyMessage?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
}) {
  if (status !== "ready") {
    return <StateView status={status} emptyMessage={emptyMessage} />;
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => {
              const active = sortBy === column.key;
              return (
                <th
                  key={column.key}
                  className={column.numeric ? "is-numeric" : undefined}
                  aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                >
                  {column.sortable && onSort ? (
                    <button type="button" className="table__sort" onClick={() => onSort(column.key)}>
                      {column.header}
                      {active ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.key} className={column.numeric ? "is-numeric" : undefined}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
