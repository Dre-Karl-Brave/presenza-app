import { eq, sql, type SQL } from "drizzle-orm";
import {
  attendanceLogs,
  classSections,
  classSessions,
  classes,
  students,
  subjects,
} from "@/db/schema";
import { emptyCounts } from "./formulas";
import { whereFilter } from "./filters";
import type { AnalyticsFilter } from "./schemas";
import type { AnalyticsDb, StatusCounts } from "./types";

// Counts of each status for every value of `key` (one SQL group-by).
// Rates are NOT computed here; see formulas.ts.
// The one join path every analytic reads through:
// log -> session -> class -> subject / section, and log -> student.
export async function countsByKey<K extends string | number | boolean>(
  db: AnalyticsDb,
  key: SQL<K>,
  filter: AnalyticsFilter,
): Promise<Map<K, StatusCounts>> {
  const rows = await db
    .select({ key, status: attendanceLogs.status, n: sql<number>`count(*)::int` })
    .from(attendanceLogs)
    .innerJoin(classSessions, eq(classSessions.id, attendanceLogs.sessionId))
    .innerJoin(classes, eq(classes.id, classSessions.classId))
    .innerJoin(subjects, eq(subjects.id, classes.subjectId))
    .innerJoin(classSections, eq(classSections.id, classes.classSectionId))
    .innerJoin(students, eq(students.id, attendanceLogs.studentId))
    .where(whereFilter(filter))
    .groupBy(key, attendanceLogs.status);

  const result = new Map<K, StatusCounts>();
  for (const row of rows) {
    const counts = result.get(row.key) ?? emptyCounts();
    counts[row.status] += row.n;
    result.set(row.key, counts);
  }
  return result;
}

// One StatusCounts for the whole filter. Grouping by the soft-delete flag is
// a constant (always false after filtering), so this reuses the same query.
export async function totalCounts(
  db: AnalyticsDb,
  filter: AnalyticsFilter,
): Promise<StatusCounts> {
  const grouped = await countsByKey(db, sql<boolean>`${attendanceLogs.deleted}`, filter);
  return grouped.get(false) ?? emptyCounts();
}
