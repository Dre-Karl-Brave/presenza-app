import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { PgAsyncDatabase } from "drizzle-orm/pg-core/async";

// Any Drizzle Postgres database (node-postgres in the app, PGlite in tests).
export type AnalyticsDb = PgAsyncDatabase<PgQueryResultHKT>;

export type StatusCounts = {
  present: number;
  late: number;
  absent: number;
  excused: number;
};

export type Stats = StatusCounts & {
  total: number;
  counted: number;
  attendanceRate: number | null;
  lateRate: number | null;
  absenceRate: number | null;
};

export type StudentRow = {
  studentId: number;
  studentNo: string;
  name: string;
  sectionName: string | null;
  stats: Stats;
};
