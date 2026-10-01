import type { AnalyticsDb } from "@/server/services/analytics/types";

export type ImportDb = AnalyticsDb;

export type AttendanceStatus = "present" | "late" | "absent" | "excused";
export type FileKind = "csv" | "xlsx";

// One validated attendance row. The seed (Step 4) builds these directly.
export type ImportRow = {
  rowNumber: number; // spreadsheet row, header is row 1
  studentNo: string;
  firstName: string;
  lastName: string;
  subjectCode: string;
  sectionName: string;
  date: string; // YYYY-MM-DD
  timeIn: number | null; // minutes since midnight
  timeOut: number | null;
  status: AttendanceStatus;
  classStart: number | null;
  classEnd: number | null;
  minutesLate: number | null; // null = calculate from the class start
};

export type ImportError = { row: number; column: string | null; message: string };

export type ImportSummary = {
  logsCreated: number;
  logsUpdated: number;
  logsUnchanged: number;
  revived: number;
  studentsCreated: number;
  subjectsCreated: number;
  sectionsCreated: number;
  classesCreated: number;
  sessionsCreated: number;
  schedulesInferred: number;
};

export type RawCell = string | number | boolean | Date | null;

export type RawTable = {
  kind: FileKind;
  headers: string[];
  records: { rowNumber: number; cells: RawCell[] }[];
};

export const emptySummary = (): ImportSummary => ({
  logsCreated: 0,
  logsUpdated: 0,
  logsUnchanged: 0,
  revived: 0,
  studentsCreated: 0,
  subjectsCreated: 0,
  sectionsCreated: 0,
  classesCreated: 0,
  sessionsCreated: 0,
  schedulesInferred: 0,
});

// Thrown for problems with the file as a whole. `status` is the HTTP status.
export class ImportFileError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ImportFileError";
    this.status = status;
  }
}

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_ROWS = 100_000;
