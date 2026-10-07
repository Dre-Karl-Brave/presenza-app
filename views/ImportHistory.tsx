"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
    { key: "fileName", header: "File", render: (b) => b.fileName },
    { key: "createdAt", header: "Imported", render: (b) => new Date(b.createdAt).toLocaleString() },
    { key: "rowsRead", header: "Rows", numeric: true, render: (b) => formatNumber(b.rowsRead) },
    { key: "rowsInvalid", header: "Skipped", numeric: true, render: (b) => formatNumber(b.rowsInvalid) },
    { key: "logsCreated", header: "New", numeric: true, render: (b) => formatNumber(b.logsCreated) },
    { key: "logsUpdated", header: "Updated", numeric: true, render: (b) => formatNumber(b.logsUpdated) },
    { key: "logsUnchanged", header: "Unchanged", numeric: true, render: (b) => formatNumber(b.logsUnchanged) },
    {
      key: "actions", header: "",
      render: (batch) =>
        confirmingId === batch.id ? (
          <span className="flex items-center gap-1.5">
            <Button variant="destructive" size="sm" className="h-6 text-[11px] rounded-[4px]"
              disabled={undo.isPending}
              onClick={() => undo.mutate({ batchId: batch.id }, { onSettled: () => setConfirmingId(null) })}>
              Yes, remove
            </Button>
            <Button variant="outline" size="sm" className="h-6 text-[11px] rounded-[4px]"
              onClick={() => setConfirmingId(null)}>
              Keep
            </Button>
          </span>
        ) : (
          <Button variant="ghost" size="sm" className="h-6 text-[11px] rounded-[4px]"
            onClick={() => setConfirmingId(batch.id)}>
            Undo
          </Button>
        ),
    },
  ];

  return (
    <div className="bg-card border border-border rounded-[6px] overflow-hidden">
      <div className="px-[18px] py-[13px] border-b border-border">
        <span className="text-[13px] font-semibold text-foreground">Import history</span>
        <span className="text-[12px] text-muted-foreground ml-2">undo removes the records an import created</span>
      </div>
      <DataTable
        columns={columns}
        rows={history.data ?? []}
        rowKey={(b) => b.id}
        status={statusOf(history, (rows) => rows.length === 0)}
        emptyMessage="No files have been imported yet."
        compact
      />
    </div>
  );
}
