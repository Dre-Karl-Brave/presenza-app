import Papa from "papaparse";
import ExcelJS from "exceljs";
import {
  ImportFileError,
  MAX_FILE_BYTES,
  MAX_ROWS,
  type FileKind,
  type RawCell,
  type RawTable,
} from "./types";

export function fileKindOf(fileName: string): FileKind {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".xlsx")) return "xlsx";
  throw new ImportFileError("Only .csv and .xlsx files can be imported.");
}

function parseCsv(bytes: Uint8Array): RawTable {
  const text = new TextDecoder("utf-8").decode(bytes).replace(/^﻿/, "");
  const result = Papa.parse<string[]>(text, { header: false, skipEmptyLines: false });
  const fatal = result.errors.find((error) => error.type === "Quotes");
  if (fatal) throw new ImportFileError(`The CSV file could not be read: ${fatal.message}`);

  const lines = result.data;
  const headers = (lines[0] ?? []).map((cell) => String(cell ?? ""));
  const records = lines.slice(1).map((cells, index) => ({
    rowNumber: index + 2,
    cells: cells.map((cell): RawCell => (cell === undefined ? null : cell)),
  }));
  return { kind: "csv", headers, records };
}

function excelToRaw(value: ExcelJS.CellValue): RawCell {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value;
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((part) => part.text).join("");
    if ("result" in value) return excelToRaw(value.result as ExcelJS.CellValue);
    if ("text" in value) return typeof value.text === "string" ? value.text : excelToRaw(value.text);
    if ("error" in value) return null;
  }
  return null;
}

// exceljs types its input as an ArrayBuffer-like Buffer; hand it a plain copy.
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

async function parseXlsx(bytes: Uint8Array): Promise<RawTable> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(toArrayBuffer(bytes));
  } catch {
    throw new ImportFileError("The XLSX file could not be read. Is it a valid .xlsx workbook?");
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new ImportFileError("The workbook has no worksheets.");
  if (sheet.rowCount - 1 > MAX_ROWS) {
    throw new ImportFileError(`The file has more than ${MAX_ROWS.toLocaleString("en-US")} rows.`, 413);
  }

  const columnCount = sheet.columnCount;
  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  for (let column = 1; column <= columnCount; column += 1) {
    const raw = excelToRaw(headerRow.getCell(column).value);
    headers.push(raw === null ? "" : String(raw));
  }

  const records: RawTable["records"] = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const cells: RawCell[] = [];
    for (let column = 1; column <= columnCount; column += 1) {
      cells.push(excelToRaw(row.getCell(column).value));
    }
    records.push({ rowNumber, cells });
  }
  return { kind: "xlsx", headers, records };
}

export async function parseFile(fileName: string, bytes: Uint8Array): Promise<RawTable> {
  const kind = fileKindOf(fileName);
  if (bytes.byteLength === 0) throw new ImportFileError("The file is empty.");
  if (bytes.byteLength > MAX_FILE_BYTES) {
    throw new ImportFileError("The file is larger than 10 MB.", 413);
  }
  const table = kind === "csv" ? parseCsv(bytes) : await parseXlsx(bytes);
  if (table.records.length > MAX_ROWS) {
    throw new ImportFileError(`The file has more than ${MAX_ROWS.toLocaleString("en-US")} rows.`, 413);
  }
  return table;
}
