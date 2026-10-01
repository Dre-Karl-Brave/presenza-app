import { beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import {
  attendanceLogs,
  classSchedules,
  classSessions,
  importBatches,
  students,
  terms,
} from "@/db/schema";
import { getStudentReport, getSummary, getTrend } from "@/server/services/analytics";
import { studentReportInputSchema } from "@/server/services/analytics/schemas";
import { clearAllData, importRows, undoImport } from "@/server/services/import";
import type { ImportRow } from "@/server/services/import";
import type { ImportDb } from "@/server/services/import/types";
import { createEmptyDb } from "../analytics/fixture";
import { commitFile, previewFile } from "./helpers";

let db: ImportDb;

beforeEach(async () => {
  db = await createEmptyDb();
});

async function countRows(): Promise<{ logs: number; students: number; batches: number }> {
  const [logs] = await db.select({ n: sql<number>`count(*)::int` }).from(attendanceLogs);
  const [people] = await db.select({ n: sql<number>`count(*)::int` }).from(students);
  const [batches] = await db.select({ n: sql<number>`count(*)::int` }).from(importBatches);
  return { logs: logs.n, students: people.n, batches: batches.n };
}

describe("importing attendance.csv", () => {
  it("creates everything it needs and the analytics see it", async () => {
    const result = await commitFile(db, "attendance.csv");
    expect(result).toMatchObject({ rowsRead: 6, validRows: 6, invalidRows: 0 });
    expect(result.summary).toMatchObject({
      logsCreated: 6,
      logsUpdated: 0,
      logsUnchanged: 0,
      studentsCreated: 3,
      subjectsCreated: 2,
      sectionsCreated: 1,
      classesCreated: 2,
      sessionsCreated: 2,
      schedulesInferred: 0,
    });

    const summary = await getSummary(db, {});
    expect(summary.stats).toMatchObject({ present: 2, late: 1, absent: 2, excused: 1, total: 6, counted: 5 });
    expect(summary.stats.attendanceRate).toBeCloseTo(3 / 5);
    expect(summary.totalStudents).toBe(3);

    const trend = await getTrend(db, {}, "day");
    expect(trend.map((p) => p.bucket)).toEqual(["2026-08-03", "2026-08-05"]);

    const report = await getStudentReport(db, studentReportInputSchema.parse({}));
    expect(report.rows.map((r) => [r.name, r.sectionName])).toEqual([
      ["Ben Cruz", "TP 1-A"],
      ["Ana Reyes", "TP 1-A"],
      ["Carla Santos", "TP 1-A"],
    ]);
  });

  it("stores the clock times from the file and calculates minutes late", async () => {
    await commitFile(db, "attendance.csv");
    const rows = await db
      .select({
        studentNo: students.studentNo,
        timeIn: sql<string | null>`to_char(${attendanceLogs.timeIn}, 'HH24:MI')`,
        minutesLate: attendanceLogs.minutesLate,
        timeInHour: attendanceLogs.timeInHour,
        status: attendanceLogs.status,
      })
      .from(attendanceLogs)
      .innerJoin(students, eq(students.id, attendanceLogs.studentId))
      .orderBy(attendanceLogs.id);
    expect(rows[0]).toMatchObject({ studentNo: "S001", timeIn: "07:58", minutesLate: 0, timeInHour: 7 });
    // Ben arrived 08:12 for an 08:00 class
    expect(rows[1]).toMatchObject({ studentNo: "S002", timeIn: "08:12", minutesLate: 12, status: "late" });
    expect(rows[2]).toMatchObject({ studentNo: "S003", timeIn: null, minutesLate: 0 });

    const sessions = await db.select().from(classSessions);
    expect(sessions.map((s) => [s.sessionDate, s.dayOfWeek, s.startHour, s.weekStart, s.monthStart]).sort()).toEqual([
      ["2026-08-03", 1, 8, "2026-08-03", "2026-08-01"],
      ["2026-08-05", 3, 10, "2026-08-03", "2026-08-01"],
    ]);
  });

  it("gives the same result from the XLSX version", async () => {
    await commitFile(db, "attendance.xlsx");
    const summary = await getSummary(db, {});
    expect(summary.stats).toMatchObject({ present: 2, late: 1, absent: 2, excused: 1 });
    const [ben] = await db
      .select({ minutesLate: attendanceLogs.minutesLate })
      .from(attendanceLogs)
      .innerJoin(students, eq(students.id, attendanceLogs.studentId))
      .where(eq(students.studentNo, "S002"));
    expect(ben.minutesLate).toBe(12);
  });
});

describe("preview", () => {
  it("reports what would happen without saving anything", async () => {
    const preview = await previewFile(db, "attendance.csv");
    expect(preview).toMatchObject({ fileKind: "csv", rowsRead: 6, validRows: 6, invalidRows: 0 });
    expect(preview.summary.logsCreated).toBe(6);
    expect(preview.summary.studentsCreated).toBe(3);
    expect(await countRows()).toEqual({ logs: 0, students: 0, batches: 0 });
  });

  it("lists errors by row and column and counts valid and invalid rows", async () => {
    const preview = await previewFile(db, "invalid.csv");
    expect(preview).toMatchObject({ rowsRead: 9, validRows: 2, invalidRows: 7, errorsTruncated: false });
    expect(preview.errors).toHaveLength(7);
    expect(preview.errors[0]).toMatchObject({ row: 2, column: "date" });
    expect(await countRows()).toEqual({ logs: 0, students: 0, batches: 0 });
  });

  it("matches what the commit then does", async () => {
    const preview = await previewFile(db, "attendance.csv");
    const commit = await commitFile(db, "attendance.csv");
    expect(commit.summary).toEqual(preview.summary);
  });
});

describe("importing a partly invalid file", () => {
  it("imports the valid rows and skips the rest", async () => {
    const result = await commitFile(db, "invalid.csv");
    expect(result).toMatchObject({ validRows: 2, invalidRows: 7 });
    expect(await countRows()).toMatchObject({ logs: 2, students: 2 });
  });
});

describe("re-uploading", () => {
  it("never doubles anything", async () => {
    await commitFile(db, "attendance.csv");
    const again = await commitFile(db, "attendance.csv");
    expect(again.summary).toMatchObject({
      logsCreated: 0,
      logsUpdated: 0,
      logsUnchanged: 6,
      studentsCreated: 0,
      sessionsCreated: 0,
      classesCreated: 0,
    });
    expect(await countRows()).toMatchObject({ logs: 6, students: 3, batches: 2 });
  });

  it("updates changed rows and leaves the rest alone", async () => {
    await commitFile(db, "attendance.csv");
    const rows: ImportRow[] = [
      {
        rowNumber: 2,
        studentNo: "S003",
        firstName: "Carla",
        lastName: "Santos",
        subjectCode: "MATH",
        sectionName: "TP 1-A",
        date: "2026-08-03",
        timeIn: 8 * 60 + 30,
        timeOut: 9 * 60,
        status: "late",
        classStart: null,
        classEnd: null,
        minutesLate: null,
      },
    ];
    const result = await importRows(db, rows, { fileName: "fix.csv", fileKind: "csv", rowsRead: 1, rowsInvalid: 0 });
    expect(result.summary).toMatchObject({ logsCreated: 0, logsUpdated: 1, logsUnchanged: 0 });
    const summary = await getSummary(db, {});
    expect(summary.stats).toMatchObject({ present: 2, late: 2, absent: 1, excused: 1 });
    expect(await countRows()).toMatchObject({ logs: 6 });
  });
});

describe("class times", () => {
  it("infers the schedule when the file gives none", async () => {
    const result = await commitFile(db, "no-times.csv");
    expect(result.summary.schedulesInferred).toBe(1);
    // earliest time in 08:55 rounds to a 09:00 start, so the 09:10 arrival is 10 minutes late
    const [eve] = await db
      .select({ minutesLate: attendanceLogs.minutesLate, hour: classSessions.startHour })
      .from(attendanceLogs)
      .innerJoin(classSessions, eq(classSessions.id, attendanceLogs.sessionId))
      .innerJoin(students, eq(students.id, attendanceLogs.studentId))
      .where(eq(students.studentNo, "S005"));
    expect(eve).toEqual({ minutesLate: 10, hour: 9 });
    const [schedule] = await db.select().from(classSchedules);
    expect(schedule).toMatchObject({ dayOfWeek: 1, startTime: "09:00:00", endTime: "10:00:00" });
  });

  it("an existing schedule wins over the times in a later file", async () => {
    await commitFile(db, "attendance.csv"); // MATH on Mondays starts 08:00
    const rows: ImportRow[] = [
      {
        rowNumber: 2,
        studentNo: "S009",
        firstName: "Zed",
        lastName: "Zane",
        subjectCode: "MATH",
        sectionName: "TP 1-A",
        date: "2026-08-10", // a Monday, new session
        timeIn: 8 * 60 + 20,
        timeOut: null,
        status: "late",
        classStart: 9 * 60,
        classEnd: 10 * 60,
        minutesLate: null,
      },
    ];
    await importRows(db, rows, { fileName: "x.csv", fileKind: "csv", rowsRead: 1, rowsInvalid: 0 });
    const [log] = await db
      .select({ minutesLate: attendanceLogs.minutesLate })
      .from(attendanceLogs)
      .innerJoin(students, eq(students.id, attendanceLogs.studentId))
      .where(eq(students.studentNo, "S009"));
    expect(log.minutesLate).toBe(20);
  });
});

describe("terms", () => {
  it("never rejects a date because of the term: it extends the existing one", async () => {
    await commitFile(db, "attendance.csv");
    const [before] = await db.select().from(terms);
    expect(before).toMatchObject({ startDate: "2026-08-01", endDate: "2026-12-31" });
    // shrink the term so a later date falls outside it
    await db.update(terms).set({ endDate: "2026-08-31" }).where(eq(terms.id, before.id));

    const rows: ImportRow[] = [
      {
        rowNumber: 2,
        studentNo: "S001",
        firstName: "Ana",
        lastName: "Reyes",
        subjectCode: "MATH",
        sectionName: "TP 1-A",
        date: "2026-09-14",
        timeIn: 8 * 60,
        timeOut: null,
        status: "present",
        classStart: 8 * 60,
        classEnd: 9 * 60,
        minutesLate: null,
      },
    ];
    const result = await importRows(db, rows, { fileName: "x.csv", fileKind: "csv", rowsRead: 1, rowsInvalid: 0 });
    expect(result.errors).toEqual([]);
    expect(result.summary.logsCreated).toBe(1);
    const all = await db.select().from(terms);
    expect(all).toHaveLength(1);
    expect(all[0].endDate).toBe("2026-09-14");
  });
});

describe("cancelled sessions", () => {
  it("rejects rows that fall on a cancelled session", async () => {
    await commitFile(db, "attendance.csv");
    await db.update(classSessions).set({ sessionStatus: "cancelled" }).where(eq(classSessions.sessionDate, "2026-08-03"));
    const preview = await previewFile(db, "attendance.csv");
    expect(preview.validRows).toBe(3);
    expect(preview.errors.map((e) => [e.row, e.column])).toEqual([
      [2, "date"],
      [3, "date"],
      [4, "date"],
    ]);
  });
});

describe("undo", () => {
  it("removes only what that import created", async () => {
    const first = await commitFile(db, "attendance.csv");
    const second = await commitFile(db, "no-times.csv");

    const undone = await undoImport(db, second.batchId);
    expect(undone).toMatchObject({ logsRemoved: 2, studentsRemoved: 2, sessionsRemoved: 1, classesRemoved: 1, sectionsRemoved: 1 });
    expect(undone.subjectsRemoved).toBe(0); // MATH is still used by the first import

    const summary = await getSummary(db, {});
    expect(summary.stats).toMatchObject({ total: 6, present: 2, late: 1 });
    expect(summary.totalStudents).toBe(3);

    const history = await db.select().from(importBatches).where(eq(importBatches.deleted, false));
    expect(history.map((h) => h.id)).toEqual([first.batchId]);
  });

  it("cannot be undone twice, and the file can be imported again afterwards", async () => {
    const first = await commitFile(db, "attendance.csv");
    await undoImport(db, first.batchId);
    expect((await getSummary(db, {})).stats.total).toBe(0);
    await expect(undoImport(db, first.batchId)).rejects.toThrow(/not found/);

    const again = await commitFile(db, "attendance.csv");
    expect(again.summary.logsCreated + again.summary.logsUpdated).toBe(6);
    expect(again.summary.revived).toBeGreaterThan(0);
    expect((await getSummary(db, {})).stats).toMatchObject({ present: 2, late: 1, absent: 2, excused: 1 });
  });
});

describe("clear all", () => {
  it("clears everything and a new import fills it again", async () => {
    await commitFile(db, "attendance.csv");
    const cleared = await clearAllData(db);
    expect(cleared.removed.attendance_logs).toBe(6);
    expect(cleared.removed.students).toBe(3);
    expect(cleared.removed.terms).toBe(1);
    expect(cleared.removed.import_batches).toBe(1);

    expect((await getSummary(db, {})).stats.total).toBe(0);
    expect((await getStudentReport(db, studentReportInputSchema.parse({}))).total).toBe(0);

    const again = await commitFile(db, "attendance.csv");
    expect(again.summary.revived).toBeGreaterThan(0);
    expect(again.summary.studentsCreated).toBe(0);
    expect((await getSummary(db, {})).stats).toMatchObject({ present: 2, late: 1, absent: 2, excused: 1 });

    const second = await clearAllData(db);
    expect(second.removed.attendance_logs).toBe(6);
  });

  it("is harmless on an empty database", async () => {
    const cleared = await clearAllData(db);
    expect(Object.values(cleared.removed).every((n) => n === 0)).toBe(true);
  });
});

describe("importRows without a file (the path the seed will use)", () => {
  it("does nothing for no rows", async () => {
    const result = await importRows(db, [], { fileName: "none", fileKind: "generated", rowsRead: 0, rowsInvalid: 0 });
    expect(result).toMatchObject({ batchId: null, appliedRows: 0 });
  });
});
