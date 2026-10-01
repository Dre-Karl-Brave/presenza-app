// One-off: builds attendance.xlsx with real date and time cells (same rows as attendance.csv).
// Run: npx tsx tests/import/fixtures/make-xlsx.mts
import ExcelJS from "exceljs";

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet("Attendance");
sheet.addRow([
  "Student Number", "Student Name", "Subject Code", "Section", "Date",
  "Time In", "Time Out", "Status", "Class Start", "Class End",
]);

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const time = (hhmm: string | null) =>
  hhmm === null ? null : new Date(`1899-12-30T${hhmm}:00Z`);

const rows: [string, string, string, string, string, string | null, string | null, string, string, string][] = [
  ["S001", "Reyes, Ana", "MATH", "TP 1-A", "2026-08-03", "07:58", "09:00", "present", "08:00", "09:00"],
  ["S002", "Ben Cruz", "MATH", "TP 1-A", "2026-08-03", "08:12", "09:00", "late", "08:00", "09:00"],
  ["S003", "Carla Santos", "MATH", "TP 1-A", "2026-08-03", null, null, "absent", "08:00", "09:00"],
  ["S001", "Reyes, Ana", "ENG", "TP 1-A", "2026-08-05", "09:55", "11:00", "present", "10:00", "11:00"],
  ["S002", "Ben Cruz", "ENG", "TP 1-A", "2026-08-05", null, null, "absent", "10:00", "11:00"],
  ["S003", "Carla Santos", "ENG", "TP 1-A", "2026-08-05", null, null, "excused", "10:00", "11:00"],
];
for (const [no, name, subject, section, date, tin, tout, status, cs, ce] of rows) {
  sheet.addRow([no, name, subject, section, day(date), time(tin), time(tout), status, time(cs), time(ce)]);
}
sheet.getColumn(5).numFmt = "yyyy-mm-dd";
for (const column of [6, 7, 9, 10]) sheet.getColumn(column).numFmt = "hh:mm";

await workbook.xlsx.writeFile("tests/import/fixtures/attendance.xlsx");
