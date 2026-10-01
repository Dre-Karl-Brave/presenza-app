# Presenza: API (tRPC)

Endpoint: `POST/GET /api/trpc/*` (fetch adapter). No auth. Validation with zod. Dates are `YYYY-MM-DD` strings; months are `YYYY-MM`.

Routers: `analytics` (Step 2), `import` (Step 3B, reserved, not designed here).

## Shared types

```ts
// Every filter is optional; omitted = no restriction. All combine with AND.
type AnalyticsFilter = {
  dateFrom?: string;       // YYYY-MM-DD, inclusive, on session date
  dateTo?: string;         // YYYY-MM-DD, inclusive
  dayOfWeek?: number;      // 1 (Mon) .. 7 (Sun)
  hour?: number;           // 0..23, class start hour
  week?: string;           // Monday date YYYY-MM-DD (matches class_sessions.week_start)
  month?: string;          // YYYY-MM
  subjectId?: number;
  sectionId?: number;
};

// The one stats shape returned by every aggregate endpoint.
type Stats = {
  present: number;
  late: number;
  absent: number;
  excused: number;
  total: number;                 // all records, incl. excused
  counted: number;               // total - excused (the rate denominator)
  attendanceRate: number | null; // (present + late) / counted, 0..1, null if counted = 0
  lateRate: number | null;       // late / counted
  absenceRate: number | null;    // absent / counted
};
```

Rates are fractions (0 to 1) and unrounded. Formatting to "87.5%" happens in `lib/format.ts` (presentation only). Formula: see DECISIONS D-02.

## analytics procedures (all queries)

All take `{ filter?: AnalyticsFilter }` unless stated. Cancelled sessions and soft-deleted rows are always excluded.

| Procedure | Input | Output |
| --- | --- | --- |
| `analytics.filterOptions` | none | `{ subjects: {id, code, title}[]; sections: {id, name}[]; weeks: string[]; months: string[]; hours: number[]; dateMin: string \| null; dateMax: string \| null }`. Feeds the FilterBar. Empty arrays on an empty DB. |
| `analytics.summary` | filter | `{ stats: Stats; totalStudents: number; lowAttendanceCount: number; highestAbsenceWeekday: { dayOfWeek: number; name: string; absenceRate: number } \| null }`. Dashboard + paper figures. `totalStudents` = distinct students with at least one record in the filter. |
| `analytics.trend` | `{ filter?, granularity: "day" \| "week" \| "month" }` | `{ bucket: string; stats: Stats }[]` ordered ascending. `bucket` is the date, the week's Monday, or `YYYY-MM`. One procedure serves charts 1, 2, 3. |
| `analytics.absencesByDayOfWeek` | filter | `{ dayOfWeek: number; name: string; stats: Stats }[]` for days that have data, Mon..Sun. Chart uses `stats.absent` (count) or `stats.absenceRate`. |
| `analytics.lateByHour` | filter | `{ hour: number; label: string; stats: Stats }[]` ascending by hour. Chart uses `stats.late` / `stats.lateRate`. |
| `analytics.bySubject` | filter | `{ subjectId: number; code: string; title: string; stats: Stats }[]` sorted by code. Chart 6 and Subject report. |
| `analytics.bySection` | filter | `{ sectionId: number; name: string; stats: Stats }[]` sorted by name. Chart 7 and Section report. |
| `analytics.statusBreakdown` | filter | `{ stats: Stats; shares: { present: number; late: number; absent: number; excused: number } }`. `shares` are fractions of `total` (so all four add to 1, unlike rates which exclude excused). `null`-safe: all 0 when empty. |
| `analytics.studentReport` | `{ filter?, search?: string, sortBy?: "name" \| "studentNo" \| "attendanceRate" \| "absent" (default "name"), sortDir?: "asc" \| "desc", page?: number (default 1), pageSize?: number (default 25, max 100) }` | `{ rows: StudentRow[]; total: number; page: number; pageSize: number }` where `StudentRow = { studentId: number; studentNo: string; name: string; sectionName: string \| null; stats: Stats }`. `search` matches student number or first/last/full name, case-insensitive substring. |
| `analytics.lowAttendance` | filter | `{ threshold: 0.8; rows: StudentRow[] }`: students with `attendanceRate < 0.8` (strictly), ascending by rate. Students with `attendanceRate = null` are excluded. Not paginated (one semester). |

Section report and Subject report are `bySection` and `bySubject` rendered as tables; no extra procedures.

Every procedure that takes a filter accepts no input at all (empty filter). `analytics.trend` requires `granularity`.

Errors: invalid input returns tRPC `BAD_REQUEST` with the zod issues. Empty database is never an error; it returns zeros/empty arrays/nulls.

## Import (Step 3B, planned)

### HTTP routes (not tRPC, because they carry files)

**`POST /api/import?mode=preview|commit`**: `multipart/form-data`, one field `file` (.csv or .xlsx, up to 10 MB, up to 100,000 rows).

```ts
type ImportError = { row: number; column: string | null; message: string }; // row = spreadsheet row, header is row 1

type ImportSummary = {
  logsCreated: number;
  logsUpdated: number;
  logsUnchanged: number;
  revived: number;            // soft-deleted rows brought back
  studentsCreated: number;
  subjectsCreated: number;
  sectionsCreated: number;
  classesCreated: number;
  sessionsCreated: number;
  schedulesInferred: number;  // schedules guessed because the file had no class times
};

// mode=preview: nothing is saved
type PreviewResponse = {
  fileName: string;
  fileKind: "csv" | "xlsx";
  rowsRead: number;
  validRows: number;
  invalidRows: number;
  errors: ImportError[];      // first 200
  errorsTruncated: boolean;
  summary: ImportSummary;     // what commit would do
  sample: Record<string, string>[]; // first 10 valid rows, as read
};

// mode=commit: valid rows saved in one transaction
type CommitResponse = {
  batchId: number;
  rowsRead: number;
  validRows: number;
  invalidRows: number;
  summary: ImportSummary;
};
```

Errors: `400 { error: string }` for a wrong file type, an empty file, or missing required headers (the message lists them); `413` when over the size or row limit; `500` if the transaction fails (nothing is saved).

**`GET /api/import/template?format=csv|xlsx`**: downloads the template (header row only; the XLSX also has an "Instructions" sheet after the data sheet).

### tRPC procedures (`import` router)

| Procedure | Input | Output |
| --- | --- | --- |
| `import.history` | none | `{ id; fileName; fileKind; createdAt: string; rowsRead; rowsImported; rowsInvalid; logsCreated; logsUpdated; logsUnchanged }[]`, newest first, live batches only |
| `import.undo` (mutation) | `{ batchId: number }` | `{ logsRemoved; sessionsRemoved; studentsRemoved; subjectsRemoved; sectionsRemoved; classesRemoved }` |
| `import.clearAll` (mutation) | `{ confirm: "CLEAR" }` | `{ removed: Record<tableName, number> }`; any other `confirm` value is rejected with `BAD_REQUEST` |

Everything is a soft delete. The analytics procedures need no change: they already ignore deleted rows.
