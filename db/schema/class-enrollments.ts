import { pgTable, serial, integer, date, unique } from "drizzle-orm/pg-core";
import { dropReasonEnum } from "./enums";
import { classes } from "./classes";
import { students } from "./people";

// Junction: which students are enrolled in which class
export const classEnrollments = pgTable(
  "class_enrollments",
  {
    id: serial("class_enrollment_id").primaryKey(),
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id),
    enrolledOn: date("enrolled_on").notNull(),
    droppedOn: date("dropped_on"),
    dropReason: dropReasonEnum("drop_reason"),
  },
  (table) => [unique().on(table.classId, table.studentId)],
);
