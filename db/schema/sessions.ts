import {
  pgTable,
  serial,
  bigserial,
  integer,
  smallint,
  boolean,
  date,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";
import {
  sessionStatusEnum,
  attendanceStatusEnum,
  logMethodEnum,
  excuseReasonEnum,
} from "./enums";
import { classes, classSchedules } from "./classes";
import { rooms } from "./organization";
import { calendarDates } from "./academic-calendar";
import { students } from "./people";

// One row per actual class meeting
export const classSessions = pgTable(
  "class_sessions",
  {
    id: serial("session_id").primaryKey(),
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    classScheduleId: integer("class_schedule_id")
      .notNull()
      .references(() => classSchedules.id),
    roomId: integer("room_id")
      .notNull()
      .references(() => rooms.id),
    sessionDate: date("session_date")
      .notNull()
      .references(() => calendarDates.dateValue),
    scheduledStart: timestamp("scheduled_start", { precision: 0 }).notNull(),
    scheduledEnd: timestamp("scheduled_end", { precision: 0 }).notNull(),
    sessionStatus: sessionStatusEnum("session_status").notNull().default("held"),

    // Time grains for filtering - fill these in the seeder
    startHour: smallint("start_hour").notNull(), // 0-23
    weekStart: date("week_start").notNull(), // Monday of that week
    monthStart: date("month_start").notNull(), // 1st of that month
  },
  (table) => [
    unique().on(table.classId, table.scheduledStart),
    index("class_sessions_session_date_idx").on(table.sessionDate),
    index("class_sessions_week_start_idx").on(table.weekStart),
    index("class_sessions_month_start_idx").on(table.monthStart),
    index("class_sessions_start_hour_idx").on(table.startHour),
    index("class_sessions_class_id_idx").on(table.classId),
  ],
);

// Core fact table: one row per student per session
export const attendanceLogs = pgTable(
  "attendance_logs",
  {
    id: bigserial("log_id", { mode: "number" }).primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => classSessions.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id),
    status: attendanceStatusEnum("status").notNull(),
    timeIn: timestamp("time_in", { precision: 0 }), // NULL if absent
    timeOut: timestamp("time_out", { precision: 0 }),
    logMethod: logMethodEnum("log_method"),
    leftEarly: boolean("left_early").notNull().default(false),
    excuseReason: excuseReasonEnum("excuse_reason"),
    minutesLate: smallint("minutes_late").notNull().default(0),

    // Derived - fill these in the seeder
    minutesInClass: integer("minutes_in_class"), // timeOut - timeIn
    timeInHour: smallint("time_in_hour"), // hour of timeIn
    timeOutHour: smallint("time_out_hour"), // hour of timeOut
  },
  (table) => [
    unique().on(table.sessionId, table.studentId),
    index("attendance_logs_student_id_idx").on(table.studentId),
    index("attendance_logs_status_idx").on(table.status),
    index("attendance_logs_time_in_hour_idx").on(table.timeInHour),
  ],
);
