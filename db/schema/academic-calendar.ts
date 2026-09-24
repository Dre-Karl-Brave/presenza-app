import { pgTable, serial, integer, smallint, varchar, boolean, date, unique, index } from "drizzle-orm/pg-core";
import { termTypeEnum, gradingPeriodEnum, eventTypeEnum } from "./enums";

export const academicYears = pgTable("academic_years", {
  id: serial("academic_year_id").primaryKey(),
  label: varchar("label", { length: 20 }).notNull().unique(), // "2026-2027"
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
});

export const terms = pgTable(
  "terms",
  {
    id: serial("term_id").primaryKey(),
    academicYearId: integer("academic_year_id")
      .notNull()
      .references(() => academicYears.id),
    termType: termTypeEnum("term_type").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    midtermStart: date("midterm_start"),
    finalsStart: date("finals_start"),
  },
  (table) => [unique().on(table.academicYearId, table.termType)],
);

// Date dimension: one row per calendar day
export const calendarDates = pgTable(
  "calendar_dates",
  {
    dateValue: date("date_value").primaryKey(),
    termId: integer("term_id").references(() => terms.id),
    dayOfWeek: smallint("day_of_week").notNull(), // 1 = Monday ... 7 = Sunday
    dayName: varchar("day_name", { length: 10 }).notNull(),
    dayOfMonth: smallint("day_of_month").notNull(),
    isoWeek: smallint("iso_week").notNull(),
    weekOfTerm: smallint("week_of_term"),
    monthNum: smallint("month_num").notNull(),
    monthName: varchar("month_name", { length: 10 }).notNull(),
    quarter: smallint("quarter").notNull(),
    year: smallint("year").notNull(),
    isWeekend: boolean("is_weekend").notNull(),
    isClassDay: boolean("is_class_day").notNull().default(true),
    period: gradingPeriodEnum("period"),
  },
  (table) => [
    index("calendar_dates_term_id_idx").on(table.termId),
    index("calendar_dates_iso_week_idx").on(table.isoWeek),
    index("calendar_dates_month_num_idx").on(table.monthNum),
  ],
);

export const calendarEvents = pgTable("calendar_events", {
  id: serial("event_id").primaryKey(),
  eventDate: date("event_date")
    .notNull()
    .references(() => calendarDates.dateValue),
  eventType: eventTypeEnum("event_type").notNull(),
  name: varchar("name", { length: 150 }).notNull(), // "Typhoon Signal No. 2"
  classesCancelled: boolean("classes_cancelled").notNull().default(true),
});
