import { pgTable, serial, integer, smallint, varchar, time, unique } from "drizzle-orm/pg-core";
import { subjectTypeEnum, shiftEnum, meetingTypeEnum } from "./enums";
import { departments, rooms, programs } from "./organization";
import { terms } from "./academic-calendar";
import { instructors } from "./people";

// Subject = catalog item ("IT301 - Data Structures")
export const subjects = pgTable("subjects", {
  id: serial("subject_id").primaryKey(),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departments.id),
  code: varchar("code", { length: 15 }).notNull().unique(),
  title: varchar("title", { length: 150 }).notNull(),
  subjectType: subjectTypeEnum("subject_type").notNull(),
  lectureUnits: smallint("lecture_units").notNull().default(3),
  labUnits: smallint("lab_units").notNull().default(0),
});

// Class section = block of students ("BSIT 3-A", 1st sem 2026)
export const classSections = pgTable(
  "class_sections",
  {
    id: serial("class_section_id").primaryKey(),
    programId: integer("program_id")
      .notNull()
      .references(() => programs.id),
    termId: integer("term_id")
      .notNull()
      .references(() => terms.id),
    yearLevel: smallint("year_level").notNull(),
    sectionLetter: varchar("section_letter", { length: 5 }).notNull(),
    sectionName: varchar("section_name", { length: 30 }).notNull(),
    shift: shiftEnum("shift").notNull().default("day"),
    adviserId: integer("adviser_id").references(() => instructors.id),
  },
  (table) => [
    unique().on(
      table.programId,
      table.termId,
      table.yearLevel,
      table.sectionLetter,
    ),
  ],
);

// Class = subject + section + instructor + term
export const classes = pgTable(
  "classes",
  {
    id: serial("class_id").primaryKey(),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id),
    classSectionId: integer("class_section_id")
      .notNull()
      .references(() => classSections.id),
    instructorId: integer("instructor_id")
      .notNull()
      .references(() => instructors.id),
    termId: integer("term_id")
      .notNull()
      .references(() => terms.id),
    classCode: varchar("class_code", { length: 20 }).notNull().unique(), // "IT301-3A-26S1"
    graceMinutes: smallint("grace_minutes").notNull().default(15),
    maxAbsences: smallint("max_absences").notNull().default(7),
  },
  (table) => [
    unique().on(table.subjectId, table.classSectionId, table.termId),
  ],
);

// Weekly meeting pattern (lecture Monday/Wednesday + laboratory Friday, etc.)
export const classSchedules = pgTable("class_schedules", {
  id: serial("class_schedule_id").primaryKey(),
  classId: integer("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  roomId: integer("room_id")
    .notNull()
    .references(() => rooms.id),
  meetingType: meetingTypeEnum("meeting_type").notNull(),
  dayOfWeek: smallint("day_of_week").notNull(), // 1 = Monday ... 7 = Sunday
  startTime: time("start_time", { precision: 0 }).notNull(),
  endTime: time("end_time", { precision: 0 }).notNull(),
});
