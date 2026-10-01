import { and, eq, gte, lte, ne, type SQL } from "drizzle-orm";
import {
  attendanceLogs,
  classSections,
  classSessions,
  classes,
  students,
  subjects,
} from "@/db/schema";
import type { AnalyticsFilter } from "./schemas";

// Every query uses these conditions: soft-deleted rows anywhere in the join
// path are excluded, cancelled sessions never count, then the six filters.
export function buildConditions(filter: AnalyticsFilter): SQL[] {
  const conditions: SQL[] = [
    eq(attendanceLogs.deleted, false),
    eq(classSessions.deleted, false),
    eq(classes.deleted, false),
    eq(subjects.deleted, false),
    eq(classSections.deleted, false),
    eq(students.deleted, false),
    ne(classSessions.sessionStatus, "cancelled"),
  ];

  if (filter.dateFrom) conditions.push(gte(classSessions.sessionDate, filter.dateFrom));
  if (filter.dateTo) conditions.push(lte(classSessions.sessionDate, filter.dateTo));
  if (filter.dayOfWeek !== undefined) conditions.push(eq(classSessions.dayOfWeek, filter.dayOfWeek));
  if (filter.hour !== undefined) conditions.push(eq(classSessions.startHour, filter.hour));
  if (filter.week) conditions.push(eq(classSessions.weekStart, filter.week));
  if (filter.month) conditions.push(eq(classSessions.monthStart, `${filter.month}-01`));
  if (filter.subjectId !== undefined) conditions.push(eq(classes.subjectId, filter.subjectId));
  if (filter.sectionId !== undefined) conditions.push(eq(classes.classSectionId, filter.sectionId));

  return conditions;
}

export function whereFilter(filter: AnalyticsFilter): SQL | undefined {
  return and(...buildConditions(filter));
}
