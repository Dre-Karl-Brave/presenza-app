import { and, asc, eq, ilike, ne, or, sql } from "drizzle-orm";
import {
  classSections,
  classSessions,
  sectionStudents,
  students,
  subjects,
} from "@/db/schema";
import {
  isLowAttendance,
  LOW_ATTENDANCE_THRESHOLD,
  statusShares,
  toStats,
} from "./formulas";
import { countsByKey, totalCounts } from "./queries";
import type { AnalyticsFilter, StudentReportInput } from "./schemas";
import type { AnalyticsDb, StudentRow } from "./types";

export { analyticsFilterSchema } from "./schemas";
export type { AnalyticsFilter } from "./schemas";

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function dayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek - 1] ?? String(dayOfWeek);
}

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export async function getStatusBreakdown(db: AnalyticsDb, filter: AnalyticsFilter) {
  const stats = toStats(await totalCounts(db, filter));
  return { stats, shares: statusShares(stats) };
}

export async function getAbsencesByDayOfWeek(db: AnalyticsDb, filter: AnalyticsFilter) {
  const grouped = await countsByKey(db, sql<number>`${classSessions.dayOfWeek}`, filter);
  return [...grouped]
    .map(([dayOfWeek, counts]) => ({
      dayOfWeek,
      name: dayName(dayOfWeek),
      stats: toStats(counts),
    }))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}

export async function getLateByHour(db: AnalyticsDb, filter: AnalyticsFilter) {
  const grouped = await countsByKey(db, sql<number>`${classSessions.startHour}`, filter);
  return [...grouped]
    .map(([hour, counts]) => ({ hour, label: hourLabel(hour), stats: toStats(counts) }))
    .sort((a, b) => a.hour - b.hour);
}

export async function getTrend(
  db: AnalyticsDb,
  filter: AnalyticsFilter,
  granularity: "day" | "week" | "month",
) {
  const column =
    granularity === "day"
      ? classSessions.sessionDate
      : granularity === "week"
        ? classSessions.weekStart
        : classSessions.monthStart;
  const grouped = await countsByKey(db, sql<string>`${column}`, filter);
  return [...grouped]
    .map(([bucket, counts]) => ({
      bucket: granularity === "month" ? bucket.slice(0, 7) : bucket,
      stats: toStats(counts),
    }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket));
}

export async function getBySubject(db: AnalyticsDb, filter: AnalyticsFilter) {
  const grouped = await countsByKey(db, sql<number>`${subjects.id}`, filter);
  if (grouped.size === 0) return [];
  const rows = await db
    .select({ id: subjects.id, code: subjects.code, title: subjects.title })
    .from(subjects)
    .where(eq(subjects.deleted, false))
    .orderBy(asc(subjects.code));
  return rows.flatMap((subject) => {
    const counts = grouped.get(subject.id);
    if (!counts) return [];
    return [
      { subjectId: subject.id, code: subject.code, title: subject.title, stats: toStats(counts) },
    ];
  });
}

export async function getBySection(db: AnalyticsDb, filter: AnalyticsFilter) {
  const grouped = await countsByKey(db, sql<number>`${classSections.id}`, filter);
  if (grouped.size === 0) return [];
  const rows = await db
    .select({ id: classSections.id, name: classSections.sectionName })
    .from(classSections)
    .where(eq(classSections.deleted, false))
    .orderBy(asc(classSections.sectionName));
  return rows.flatMap((section) => {
    const counts = grouped.get(section.id);
    if (!counts) return [];
    return [{ sectionId: section.id, name: section.name, stats: toStats(counts) }];
  });
}

type StudentRowWithSortKeys = StudentRow & { lastName: string; firstName: string };

// One row per student that has records under the filter.
async function buildStudentRows(
  db: AnalyticsDb,
  filter: AnalyticsFilter,
  search?: string,
): Promise<StudentRowWithSortKeys[]> {
  const grouped = await countsByKey(db, sql<number>`${students.id}`, filter);
  if (grouped.size === 0) return [];

  const conditions = [eq(students.deleted, false)];
  if (search) {
    const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
    const match = or(
      ilike(students.studentNo, pattern),
      ilike(students.firstName, pattern),
      ilike(students.lastName, pattern),
      ilike(sql`${students.firstName} || ' ' || ${students.lastName}`, pattern),
    );
    if (match) conditions.push(match);
  }

  const [studentRows, sectionRows] = await Promise.all([
    db
      .select({
        id: students.id,
        studentNo: students.studentNo,
        firstName: students.firstName,
        lastName: students.lastName,
      })
      .from(students)
      .where(and(...conditions)),
    db
      .select({ studentId: sectionStudents.studentId, name: classSections.sectionName })
      .from(sectionStudents)
      .innerJoin(classSections, eq(classSections.id, sectionStudents.classSectionId))
      .where(and(eq(sectionStudents.deleted, false), eq(classSections.deleted, false)))
      .orderBy(asc(classSections.id)),
  ]);

  const sectionByStudent = new Map<number, string>();
  for (const row of sectionRows) {
    if (!sectionByStudent.has(row.studentId)) sectionByStudent.set(row.studentId, row.name);
  }

  return studentRows.flatMap((student) => {
    const counts = grouped.get(student.id);
    if (!counts) return [];
    return [
      {
        studentId: student.id,
        studentNo: student.studentNo,
        name: `${student.firstName} ${student.lastName}`,
        firstName: student.firstName,
        lastName: student.lastName,
        sectionName: sectionByStudent.get(student.id) ?? null,
        stats: toStats(counts),
      },
    ];
  });
}

function toPublicRow(row: StudentRowWithSortKeys): StudentRow {
  return {
    studentId: row.studentId,
    studentNo: row.studentNo,
    name: row.name,
    sectionName: row.sectionName,
    stats: row.stats,
  };
}

function compareRows(
  a: StudentRowWithSortKeys,
  b: StudentRowWithSortKeys,
  sortBy: StudentReportInput["sortBy"],
): number {
  switch (sortBy) {
    case "studentNo":
      return a.studentNo.localeCompare(b.studentNo);
    case "absent":
      return a.stats.absent - b.stats.absent;
    case "attendanceRate": {
      // Students with no rate sort last in ascending order.
      const ar = a.stats.attendanceRate ?? Number.POSITIVE_INFINITY;
      const br = b.stats.attendanceRate ?? Number.POSITIVE_INFINITY;
      return ar - br;
    }
    default:
      return (
        a.lastName.localeCompare(b.lastName) ||
        a.firstName.localeCompare(b.firstName) ||
        a.studentNo.localeCompare(b.studentNo)
      );
  }
}

export async function getStudentReport(db: AnalyticsDb, input: StudentReportInput) {
  const rows = await buildStudentRows(db, input.filter, input.search || undefined);
  const direction = input.sortDir === "asc" ? 1 : -1;
  rows.sort((a, b) => direction * compareRows(a, b, input.sortBy));
  const start = (input.page - 1) * input.pageSize;
  return {
    rows: rows.slice(start, start + input.pageSize).map(toPublicRow),
    total: rows.length,
    page: input.page,
    pageSize: input.pageSize,
  };
}

export async function getLowAttendance(db: AnalyticsDb, filter: AnalyticsFilter) {
  const rows = await buildStudentRows(db, filter);
  const low = rows
    .filter((row) => isLowAttendance(row.stats))
    .sort((a, b) => compareRows(a, b, "attendanceRate") || compareRows(a, b, "name"));
  return { threshold: LOW_ATTENDANCE_THRESHOLD, rows: low.map(toPublicRow) };
}

export async function getSummary(db: AnalyticsDb, filter: AnalyticsFilter) {
  const [counts, studentCounts, byDay] = await Promise.all([
    totalCounts(db, filter),
    countsByKey(db, sql<number>`${students.id}`, filter),
    getAbsencesByDayOfWeek(db, filter),
  ]);

  let lowAttendanceCount = 0;
  for (const studentCount of studentCounts.values()) {
    if (isLowAttendance(toStats(studentCount))) lowAttendanceCount += 1;
  }

  let highest: { dayOfWeek: number; name: string; absenceRate: number } | null = null;
  for (const day of byDay) {
    const rate = day.stats.absenceRate;
    // A weekday only counts if it has absences at all.
    if (rate !== null && rate > 0 && (highest === null || rate > highest.absenceRate)) {
      highest = { dayOfWeek: day.dayOfWeek, name: day.name, absenceRate: rate };
    }
  }

  return {
    stats: toStats(counts),
    totalStudents: studentCounts.size,
    lowAttendanceCount,
    highestAbsenceWeekday: highest,
  };
}

export async function getFilterOptions(db: AnalyticsDb) {
  const sessionScope = and(
    eq(classSessions.deleted, false),
    ne(classSessions.sessionStatus, "cancelled"),
  );
  const [subjectRows, sectionRows, weekRows, monthRows, hourRows, rangeRows] = await Promise.all([
    db
      .select({ id: subjects.id, code: subjects.code, title: subjects.title })
      .from(subjects)
      .where(eq(subjects.deleted, false))
      .orderBy(asc(subjects.code)),
    db
      .select({ id: classSections.id, name: classSections.sectionName })
      .from(classSections)
      .where(eq(classSections.deleted, false))
      .orderBy(asc(classSections.sectionName)),
    db
      .selectDistinct({ value: classSessions.weekStart })
      .from(classSessions)
      .where(sessionScope)
      .orderBy(asc(classSessions.weekStart)),
    db
      .selectDistinct({ value: classSessions.monthStart })
      .from(classSessions)
      .where(sessionScope)
      .orderBy(asc(classSessions.monthStart)),
    db
      .selectDistinct({ value: classSessions.startHour })
      .from(classSessions)
      .where(sessionScope)
      .orderBy(asc(classSessions.startHour)),
    db
      .select({
        min: sql<string | null>`min(${classSessions.sessionDate})`,
        max: sql<string | null>`max(${classSessions.sessionDate})`,
      })
      .from(classSessions)
      .where(sessionScope),
  ]);

  return {
    subjects: subjectRows,
    sections: sectionRows,
    weeks: weekRows.map((row) => row.value),
    months: monthRows.map((row) => row.value.slice(0, 7)),
    hours: hourRows.map((row) => row.value),
    dateMin: rangeRows[0]?.min ?? null,
    dateMax: rangeRows[0]?.max ?? null,
  };
}
