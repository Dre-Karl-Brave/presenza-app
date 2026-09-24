import { pgTable, serial, integer, smallint, unique } from "drizzle-orm/pg-core";
import { termTypeEnum } from "./enums";
import { programs } from "./organization";
import { subjects } from "./classes";

// Junction: which subjects a program takes, per year level and term
export const curriculumSubjects = pgTable(
  "curriculum_subjects",
  {
    id: serial("curriculum_subject_id").primaryKey(),
    programId: integer("program_id")
      .notNull()
      .references(() => programs.id),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id),
    yearLevel: smallint("year_level").notNull(),
    termType: termTypeEnum("term_type").notNull(),
  },
  (table) => [unique().on(table.programId, table.subjectId)],
);
