import { pgTable, integer, primaryKey } from "drizzle-orm/pg-core";
import { classSections } from "./classes";
import { students } from "./people";

// Junction: which students belong to which class section
export const sectionStudents = pgTable(
  "section_students",
  {
    classSectionId: integer("class_section_id")
      .notNull()
      .references(() => classSections.id),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id),
  },
  (table) => [
    primaryKey({ columns: [table.classSectionId, table.studentId] }),
  ],
);
