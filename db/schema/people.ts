import { pgTable, serial, integer, smallint, varchar, index } from "drizzle-orm/pg-core";
import {
  employmentTypeEnum,
  sexEnum,
  studentTypeEnum,
  residenceTypeEnum,
  studentStatusEnum,
} from "./enums";
import { departments, programs } from "./organization";

export const instructors = pgTable("instructors", {
  id: serial("instructor_id").primaryKey(),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departments.id),
  employeeNo: varchar("employee_no", { length: 20 }).notNull().unique(),
  firstName: varchar("first_name", { length: 50 }).notNull(),
  lastName: varchar("last_name", { length: 50 }).notNull(),
  employmentType: employmentTypeEnum("employment_type").notNull(),
});

export const students = pgTable(
  "students",
  {
    id: serial("student_id").primaryKey(),
    programId: integer("program_id")
      .notNull()
      .references(() => programs.id),
    studentNo: varchar("student_no", { length: 20 }).notNull().unique(), // "2026-00123"
    firstName: varchar("first_name", { length: 50 }).notNull(),
    lastName: varchar("last_name", { length: 50 }).notNull(),
    sex: sexEnum("sex"),
    yearLevel: smallint("year_level").notNull(),
    studentType: studentTypeEnum("student_type").notNull().default("regular"),
    residenceType: residenceTypeEnum("residence_type"),
    status: studentStatusEnum("status").notNull().default("active"),
  },
  (table) => [index("students_program_id_idx").on(table.programId)],
);
