"use client";

import { useState } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import { formatNumber } from "@/lib/format";
import { useImportHistory, useUndoImport } from "@/lib/import-client";
import { statusOf } from "@/lib/status";
import type { RouterOutputs } from "@/lib/types";

type Batch = RouterOutputs["import"]["history"][number];

export function ImportHistory() {
  const history = useImportHistory();
  const undo = useUndoImport();
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const columns: Column<Batch>[] = [
    { key: "fileName", header: "File", render: (batch) => batch.fileName },
    { key: "createdAt", header: "Imported", render: (batch) => new Date(batch.createdAt).toLocaleString() },
    { key: "rowsRead", header: "Rows", numeric: true, render: (batch) => formatNumber(batch.rowsRead) },
    { key: "rowsInvalid", header: "Skipped", numeric: true, render: (batch) => formatNumber(batch.rowsInvalid) },
    { key: "logsCreated", header: "New", numeric: true, render: (batch) => formatNumber(batch.logsCreated) },
    { key: "logsUpdated", header: "Updated", numeric: true, render: (batch) => formatNumber(batch.logsUpdated) },
    { key: "logsUnchanged", header: "Unchanged", numeric: true, render: (batch) => formatNumber(batch.logsUnchanged) },
    {
      key: "actions",
      header: "",
      render: (batch) =>
        confirmingId === batch.id ? (
          <span className="button-row">
            <button
              type="button"
              className="button button--danger"
              disabled={undo.isPending}
              onClick={() => undo.mutate({ batchId: batch.id }, { onSettled: () => setConfirmingId(null) })}
            >
              Yes, remove its records
            </button>
            <button type="button" className="button" onClick={() => setConfirmingId(null)}>
              Keep
            </button>
          </span>
        ) : (
          <button type="button" className="button" onClick={() => setConfirmingId(batch.id)}>
            Undo
          </button>
        ),
    },
  ];

  return (
    <section className="card">
      <h2 className="card__title">Import history</h2>
      <p className="card__description">
        Undo removes the attendance records an import added (and the students, sections and so on it created, if nothing
        else uses them). Records changed by a later import stay with that later import.
      </p>
      {undo.isError ? <div className="notice notice--danger card__actions">{undo.error.message}</div> : null}
      <div className="card__body">
        <DataTable
          columns={columns}
          rows={history.data ?? []}
          rowKey={(batch) => batch.id}
          status={statusOf(history, (rows) => rows.length === 0)}
          emptyMessage="No files have been imported yet."
        />
      </div>
    </section>
  );
}
