import { beforeAll, describe, expect, it } from "vitest";
import {
  getAbsencesByDayOfWeek,
  getBySection,
  getBySubject,
  getFilterOptions,
  getLateByHour,
  getLowAttendance,
  getStatusBreakdown,
  getStudentReport,
  getSummary,
  getTrend,
} from "@/server/services/analytics";
import {
  studentReportInputSchema,
  type AnalyticsFilter,
} from "@/server/services/analytics/schemas";
import type { AnalyticsDb } from "@/server/services/analytics/types";
import { createEmptyDb, createFixtureDb, type FixtureIds } from "./fixture";

// See fixture.ts for the data and the hand-computed expectations.
const NONE: AnalyticsFilter = {};

let db: AnalyticsDb;
let ids: FixtureIds;

beforeAll(async () => {
  ({ db, ids } = await createFixtureDb());
});

function report(input: Partial<Parameters<typeof studentReportInputSchema.parse>[0]> = {}) {
  return getStudentReport(db, studentReportInputSchema.parse(input));
}

describe("summary and status breakdown", () => {
  it("computes overall figures, ignoring deleted rows and cancelled sessions", async () => {
    const summary = await getSummary(db, NONE);
    expect(summary.stats).toMatchObject({
      present: 4,
      late: 2,
      absent: 4,
      excused: 1,
      total: 11,
      counted: 10,
    });
    expect(summary.stats.attendanceRate).toBeCloseTo(0.6);
    expect(summary.stats.lateRate).toBeCloseTo(0.2);
    expect(summary.stats.absenceRate).toBeCloseTo(0.4);
    expect(summary.totalStudents).toBe(4);
    expect(summary.lowAttendanceCount).toBe(3);
  });

  it("finds the weekday with the highest absence RATE, not count", async () => {
    // Monday has 2 absences (rate 2/7); Tuesday has 1 absence out of 1 (rate 1).
    const summary = await getSummary(db, NONE);
    expect(summary.highestAbsenceWeekday).toEqual({
      dayOfWeek: 2,
      name: "Tuesday",
      absenceRate: 1,
    });
  });

  it("reports no highest-absence weekday when nobody is absent", async () => {
    const summary = await getSummary(db, { hour: 10, dayOfWeek: 1 });
    expect(summary.highestAbsenceWeekday).toBeNull();
    const noAbsences = await getSummary(db, { subjectId: ids.subjects.eng, dayOfWeek: 3, hour: 99 });
    expect(noAbsences.highestAbsenceWeekday).toBeNull();
  });

  it("status breakdown shares are over all records including excused", async () => {
    const { shares } = await getStatusBreakdown(db, NONE);
    expect(shares.present).toBeCloseTo(4 / 11);
    expect(shares.late).toBeCloseTo(2 / 11);
    expect(shares.absent).toBeCloseTo(4 / 11);
    expect(shares.excused).toBeCloseTo(1 / 11);
  });
});

describe("trends", () => {
  it("daily", async () => {
    const trend = await getTrend(db, NONE, "day");
    expect(trend.map((p) => p.bucket)).toEqual([
      "2026-08-03",
      "2026-08-05",
      "2026-08-10",
      "2026-09-07",
      "2026-09-08",
    ]);
    expect(trend.map((p) => p.stats.attendanceRate)).toEqual([2 / 3, 0.5, 2 / 3, 1, 0]);
  });

  it("weekly buckets by Monday", async () => {
    const trend = await getTrend(db, NONE, "week");
    expect(trend.map((p) => p.bucket)).toEqual(["2026-08-03", "2026-08-10", "2026-09-07"]);
    expect(trend[0].stats).toMatchObject({ present: 2, late: 1, absent: 2, excused: 1 });
    expect(trend[0].stats.attendanceRate).toBeCloseTo(3 / 5);
    expect(trend[2].stats.attendanceRate).toBeCloseTo(0.5);
  });

  it("monthly buckets as YYYY-MM", async () => {
    const trend = await getTrend(db, NONE, "month");
    expect(trend.map((p) => p.bucket)).toEqual(["2026-08", "2026-09"]);
    expect(trend[0].stats.attendanceRate).toBeCloseTo(5 / 8);
    expect(trend[1].stats.attendanceRate).toBeCloseTo(0.5);
  });
});

describe("day of week and hour", () => {
  it("absences by day of week", async () => {
    const days = await getAbsencesByDayOfWeek(db, NONE);
    expect(days.map((d) => [d.dayOfWeek, d.name, d.stats.absent])).toEqual([
      [1, "Monday", 2],
      [2, "Tuesday", 1],
      [3, "Wednesday", 1],
    ]);
    expect(days[0].stats.absenceRate).toBeCloseTo(2 / 7);
  });

  it("late arrivals by class hour", async () => {
    const hours = await getLateByHour(db, NONE);
    expect(hours.map((h) => [h.hour, h.label, h.stats.late])).toEqual([
      [8, "08:00", 2],
      [9, "09:00", 0],
      [10, "10:00", 0],
    ]);
    expect(hours[0].stats.lateRate).toBeCloseTo(2 / 7);
  });
});

describe("by subject and section", () => {
  it("by subject", async () => {
    const rows = await getBySubject(db, NONE);
    expect(rows.map((r) => r.code)).toEqual(["ENG", "MATH"]);
    expect(rows[0].stats.attendanceRate).toBeCloseTo(0.5);
    expect(rows[1].stats).toMatchObject({ present: 3, late: 2, absent: 3, excused: 0 });
    expect(rows[1].stats.attendanceRate).toBeCloseTo(5 / 8);
  });

  it("by section", async () => {
    const rows = await getBySection(db, NONE);
    expect(rows.map((r) => r.name)).toEqual(["TP 1-A", "TP 1-B"]);
    expect(rows[0].stats.attendanceRate).toBeCloseTo(5 / 8);
    expect(rows[1].stats.attendanceRate).toBeCloseTo(0.5);
  });
});

describe("filters", () => {
  it("subject", async () => {
    const { stats } = await getSummary(db, { subjectId: ids.subjects.eng });
    expect(stats).toMatchObject({ present: 1, late: 0, absent: 1, excused: 1 });
  });

  it("section", async () => {
    const { stats } = await getSummary(db, { sectionId: ids.sections.b });
    expect(stats).toMatchObject({ present: 1, absent: 1, total: 2 });
  });

  it("day of week", async () => {
    const { stats } = await getSummary(db, { dayOfWeek: 1 });
    expect(stats).toMatchObject({ present: 3, late: 2, absent: 2, excused: 0 });
  });

  it("hour", async () => {
    const { stats } = await getSummary(db, { hour: 10 });
    expect(stats).toMatchObject({ present: 1, absent: 1, excused: 1, total: 3 });
  });

  it("week", async () => {
    const { stats } = await getSummary(db, { week: "2026-08-03" });
    expect(stats.total).toBe(6);
  });

  it("month", async () => {
    const { stats } = await getSummary(db, { month: "2026-09" });
    expect(stats).toMatchObject({ present: 1, absent: 1, total: 2 });
  });

  it("date range is inclusive", async () => {
    const { stats } = await getSummary(db, { dateFrom: "2026-08-05", dateTo: "2026-08-10" });
    expect(stats.total).toBe(6);
  });

  it("combines with AND", async () => {
    const { stats } = await getSummary(db, { dayOfWeek: 1, subjectId: ids.subjects.math, month: "2026-08" });
    expect(stats).toMatchObject({ present: 2, late: 2, absent: 2, total: 6 });
  });

  it("returns empty results when nothing matches", async () => {
    const { stats, totalStudents, highestAbsenceWeekday } = await getSummary(db, { hour: 23 });
    expect(stats.total).toBe(0);
    expect(stats.attendanceRate).toBeNull();
    expect(totalStudents).toBe(0);
    expect(highestAbsenceWeekday).toBeNull();
  });
});

describe("student report", () => {
  it("lists students with counts and rate, sorted by last name by default", async () => {
    const result = await report();
    expect(result.total).toBe(4);
    expect(result.rows.map((r) => r.name)).toEqual([
      "Ben Cruz",
      "Dan Lopez",
      "Ana Reyes",
      "Carla Santos",
    ]);
    const ben = result.rows[0];
    expect(ben).toMatchObject({ studentNo: "S002", sectionName: "TP 1-A" });
    expect(ben.stats).toMatchObject({ present: 0, late: 2, absent: 1, excused: 0 });
    expect(ben.stats.attendanceRate).toBeCloseTo(2 / 3);
  });

  it("searches by name, full name, and student number; case-insensitive", async () => {
    expect((await report({ search: "cruz" })).rows.map((r) => r.studentNo)).toEqual(["S002"]);
    expect((await report({ search: "ana reyes" })).rows.map((r) => r.studentNo)).toEqual(["S001"]);
    expect((await report({ search: "s00" })).total).toBe(4);
    expect((await report({ search: "S003" })).rows.map((r) => r.name)).toEqual(["Carla Santos"]);
  });

  it("treats % and _ as literal characters", async () => {
    expect((await report({ search: "%" })).total).toBe(0);
    expect((await report({ search: "_" })).total).toBe(0);
  });

  it("never returns a soft-deleted student", async () => {
    expect((await report({ search: "Mora" })).total).toBe(0);
  });

  it("paginates", async () => {
    const page2 = await report({ page: 2, pageSize: 2 });
    expect(page2.total).toBe(4);
    expect(page2.rows.map((r) => r.name)).toEqual(["Ana Reyes", "Carla Santos"]);
  });

  it("sorts by attendance rate", async () => {
    const result = await report({ sortBy: "attendanceRate", sortDir: "asc" });
    expect(result.rows.map((r) => r.studentNo)).toEqual(["S003", "S004", "S002", "S001"]);
  });

  it("respects the other filters", async () => {
    const result = await report({ filter: { sectionId: ids.sections.b } });
    expect(result.rows.map((r) => r.name)).toEqual(["Dan Lopez"]);
  });
});

describe("low attendance", () => {
  it("lists students strictly below 80 percent, lowest first", async () => {
    const { threshold, rows } = await getLowAttendance(db, NONE);
    expect(threshold).toBe(0.8);
    expect(rows.map((r) => [r.name, r.stats.attendanceRate])).toEqual([
      ["Carla Santos", 0],
      ["Dan Lopez", 0.5],
      ["Ben Cruz", 2 / 3],
    ]);
  });

  it("changes with the filter", async () => {
    // In week 2026-08-03 Ben has L + A (rate 0.5), Ana is perfect, Carla A + E (rate 0).
    const { rows } = await getLowAttendance(db, { week: "2026-08-03" });
    expect(rows.map((r) => r.studentNo)).toEqual(["S003", "S002"]);
  });
});

describe("filter options", () => {
  it("lists subjects, sections, weeks, months and the date range", async () => {
    const options = await getFilterOptions(db);
    expect(options.subjects.map((s) => s.code)).toEqual(["ENG", "MATH"]);
    expect(options.sections.map((s) => s.name)).toEqual(["TP 1-A", "TP 1-B"]);
    expect(options.weeks).toEqual(["2026-08-03", "2026-08-10", "2026-09-07"]);
    expect(options.months).toEqual(["2026-08", "2026-09"]);
    expect(options.hours).toEqual([8, 9, 10]);
    expect(options.dateMin).toBe("2026-08-03");
    expect(options.dateMax).toBe("2026-09-08");
  });
});

describe("empty database", () => {
  it("returns zeros, nulls and empty lists instead of failing", async () => {
    const empty = await createEmptyDb();
    const summary = await getSummary(empty, NONE);
    expect(summary).toMatchObject({
      totalStudents: 0,
      lowAttendanceCount: 0,
      highestAbsenceWeekday: null,
    });
    expect(summary.stats.total).toBe(0);
    expect(summary.stats.attendanceRate).toBeNull();
    expect(await getTrend(empty, NONE, "day")).toEqual([]);
    expect(await getBySubject(empty, NONE)).toEqual([]);
    expect(await getBySection(empty, NONE)).toEqual([]);
    expect((await getLowAttendance(empty, NONE)).rows).toEqual([]);
    expect((await getStudentReport(empty, studentReportInputSchema.parse({}))).total).toBe(0);
    expect(await getFilterOptions(empty)).toMatchObject({
      subjects: [],
      weeks: [],
      hours: [],
      dateMin: null,
      dateMax: null,
    });
  });
});
