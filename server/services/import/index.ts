import { importRows } from "./import-rows";
import { parseFile } from "./parse";
import { ImportFileError, type FileKind, type ImportDb, type ImportError, type ImportSummary } from "./types";
import { validateTable } from "./validate";

export { importRows } from "./import-rows";
export type { ImportOptions, ImportResult } from "./import-rows";
export { clearAllData, undoImport } from "./undo";
export { ImportFileError } from "./types";
export type { ImportError, ImportRow, ImportSummary } from "./types";

const MAX_ERRORS_SHOWN = 200;

export type PreviewResponse = {
  fileName: string;
  fileKind: FileKind;
  rowsRead: number;
  validRows: number;
  invalidRows: number;
  errors: ImportError[];
  errorsTruncated: boolean;
  summary: ImportSummary;
  sample: Record<string, string>[];
};

export type CommitResponse = {
  batchId: number;
  rowsRead: number;
  validRows: number;
  invalidRows: number;
  summary: ImportSummary;
};

export type ProcessInput = { fileName: string; bytes: Uint8Array; mode: "preview" | "commit" };

// Parse, validate, then import (or only preview) one uploaded file.
export async function processImportFile(
  db: ImportDb,
  input: ProcessInput,
): Promise<PreviewResponse | CommitResponse> {
  const table = await parseFile(input.fileName, input.bytes);
  const validation = validateTable(table);

  const invalidInFile = new Set(validation.errors.map((error) => error.row)).size;
  const result = await importRows(db, validation.rows, {
    fileName: input.fileName,
    fileKind: table.kind,
    rowsRead: validation.rowsRead,
    rowsInvalid: invalidInFile,
    dryRun: input.mode === "preview",
  });

  const errors = [...validation.errors, ...result.errors].sort((a, b) => a.row - b.row);
  const invalidRows = new Set(errors.map((error) => error.row)).size;

  if (input.mode === "commit") {
    if (result.batchId === null) throw new ImportFileError("There are no valid rows to import.");
    return {
      batchId: result.batchId,
      rowsRead: validation.rowsRead,
      validRows: result.appliedRows,
      invalidRows,
      summary: result.summary,
    };
  }

  return {
    fileName: input.fileName,
    fileKind: table.kind,
    rowsRead: validation.rowsRead,
    validRows: result.appliedRows,
    invalidRows,
    errors: errors.slice(0, MAX_ERRORS_SHOWN),
    errorsTruncated: errors.length > MAX_ERRORS_SHOWN,
    summary: result.summary,
    sample: validation.sample,
  };
}
