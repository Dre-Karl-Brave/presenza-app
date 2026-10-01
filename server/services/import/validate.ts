import { COLUMNS, columnHeader, mapHeaders, type ColumnKey } from "./columns";
import { addDays, dayName, isoDayOfWeek, parseTime, toIsoDate } from "./dates";
import { splitName } from "./names";
import { rowSchema } from "./row-schema";
import { ImportFileError, type ImportError, type ImportRow, type RawCell, type RawTable } from "./types";

const TIME_KEYS: ColumnKey[] = ["timeIn", "timeOut", "classStart", "classEnd"];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

// Turns whatever the file held (text, number, spreadsheet date) into the text
// the row schema expects.
function cellToText(key: ColumnKey, cell: RawCell | undefined): string {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) {
    if (TIME_KEYS.includes(key)) return `${pad(cell.getUTCHours())}:${pad(cell.getUTCMinutes())}`;
    return toIsoDate(cell);
  }
  if (typeof cell === "number") {
    if (key === "date" && cell >= 1) return addDays("1899-12-30", Math.floor(cell));
    if (TIME_KEYS.includes(key) && cell >= 0 && cell < 1) {
      const minutes = Math.round(cell * 1440);
      return `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
    }
    return String(cell);
  }
  return String(cell).trim();
}

function isBlank(cells: RawCell[]): boolean {
  return cells.every((cell) => cell === null || (typeof cell === "string" && cell.trim() === ""));
}

export type ValidationResult = {
  rows: ImportRow[];
  errors: ImportError[];
  rowsRead: number; // non-empty data rows
  sample: Record<string, string>[]; // first valid rows as read, keyed by column header
};

const SAMPLE_SIZE = 10;

export function validateTable(table: RawTable): ValidationResult {
  const { indexByKey, missing } = mapHeaders(table.headers);
  if (missing.length > 0) {
    throw new ImportFileError(`Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`);
  }

  const rows: ImportRow[] = [];
  const errors: ImportError[] = [];
  const sample: Record<string, string>[] = [];
  let rowsRead = 0;

  const seenLogs = new Map<string, number>(); // student+class+date -> first row number
  const seenTimes = new Map<string, { row: number; start: number; end: number }>(); // class+weekday

  for (const record of table.records) {
    if (isBlank(record.cells)) continue;
    rowsRead += 1;

    const text: Record<string, string> = {};
    for (const column of COLUMNS) {
      const index = indexByKey.get(column.key);
      text[column.key] = index === undefined ? "" : cellToText(column.key, record.cells[index]);
    }

    const parsed = rowSchema.safeParse(text);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        const column = typeof key === "string" ? columnHeader(key as ColumnKey) : null;
        errors.push({ row: record.rowNumber, column, message: column ? `${column} ${issue.message}` : issue.message });
      }
      continue;
    }

    const value = parsed.data;
    const name = splitName(value.studentName);
    if (!name) continue; // already rejected by the schema

    const row: ImportRow = {
      rowNumber: record.rowNumber,
      studentNo: value.studentNo.toUpperCase(),
      firstName: name.firstName,
      lastName: name.lastName,
      subjectCode: value.subjectCode.toUpperCase(),
      sectionName: value.section.replace(/\s+/g, " "),
      date: value.date,
      timeIn: value.status === "present" || value.status === "late" ? parseTime(value.timeIn ?? "") : null,
      timeOut:
        (value.status === "present" || value.status === "late") && value.timeOut !== undefined
          ? parseTime(value.timeOut)
          : null,
      status: value.status,
      classStart: value.classStart === undefined ? null : parseTime(value.classStart),
      classEnd: value.classEnd === undefined ? null : parseTime(value.classEnd),
      minutesLate: value.minutesLate === undefined ? null : Number(value.minutesLate),
    };

    const classKey = `${row.subjectCode}|${row.sectionName.toLowerCase()}`;

    const logKey = `${row.studentNo}|${classKey}|${row.date}`;
    const firstLog = seenLogs.get(logKey);
    if (firstLog !== undefined) {
      errors.push({
        row: row.rowNumber,
        column: columnHeader("studentNo"),
        message: `duplicate of row ${firstLog} (same student, subject, section and date)`,
      });
      continue;
    }

    if (row.classStart !== null && row.classEnd !== null) {
      const weekday = isoDayOfWeek(row.date);
      const timesKey = `${classKey}|${weekday}`;
      const first = seenTimes.get(timesKey);
      if (first && (first.start !== row.classStart || first.end !== row.classEnd)) {
        errors.push({
          row: row.rowNumber,
          column: columnHeader("classStart"),
          message: `class times conflict with row ${first.row}, which gives a different time for this class on ${dayName(weekday)}s`,
        });
        continue;
      }
      if (!first) seenTimes.set(timesKey, { row: row.rowNumber, start: row.classStart, end: row.classEnd });
    }

    seenLogs.set(logKey, row.rowNumber);
    rows.push(row);
    if (sample.length < SAMPLE_SIZE) {
      const asRead: Record<string, string> = {};
      for (const column of COLUMNS) {
        if (indexByKey.has(column.key)) asRead[column.header] = text[column.key];
      }
      sample.push(asRead);
    }
  }

  return { rows, errors, rowsRead, sample };
}
