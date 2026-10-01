import { and, eq, inArray, sql } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import {
  academicYears,
  attendanceLogs,
  buildings,
  calendarDates,
  calendarEvents,
  classEnrollments,
  classSchedules,
  classSections,
  classSessions,
  classes,
  curriculumSubjects,
  departments,
  importBatches,
  instructors,
  programs,
  rooms,
  sectionStudents,
  students,
  subjects,
  terms,
} from "@/db/schema";
import { chunk } from "./context";
import { ImportFileError, type ImportDb } from "./types";

export type UndoResult = {
  logsRemoved: number;
  sessionsRemoved: number;
  studentsRemoved: number;
  subjectsRemoved: number;
  sectionsRemoved: number;
  classesRemoved: number;
};

const ONE = sql<number>`1`;

// Soft-deletes everything one import created, but only what nothing else
// still uses. Rows from other imports are never touched.
export async function undoImport(db: ImportDb, batchId: number): Promise<UndoResult> {
  return db.transaction(async (tx) => {
    const [batch] = await tx
      .select()
      .from(importBatches)
      .where(and(eq(importBatches.id, batchId), eq(importBatches.deleted, false)));
    if (!batch) throw new ImportFileError("That import was not found. It may already be undone.", 404);
    const created = batch.createdIds;

    const logs = await tx
      .update(attendanceLogs)
      .set({ deleted: true })
      .where(and(eq(attendanceLogs.importBatchId, batchId), eq(attendanceLogs.deleted, false)))
      .returning({ n: ONE });

    const sessions =
      created.sessions.length === 0
        ? []
        : await tx
            .update(classSessions)
            .set({ deleted: true })
            .where(
              and(
                inArray(classSessions.id, created.sessions),
                eq(classSessions.deleted, false),
                sql`not exists (select 1 from ${attendanceLogs} where ${attendanceLogs.sessionId} = ${classSessions.id} and ${attendanceLogs.deleted} = false)`,
              ),
            )
            .returning({ n: ONE });

    if (created.schedules.length > 0) {
      await tx
        .update(classSchedules)
        .set({ deleted: true })
        .where(
          and(
            inArray(classSchedules.id, created.schedules),
            eq(classSchedules.deleted, false),
            sql`not exists (select 1 from ${classSessions} where ${classSessions.classScheduleId} = ${classSchedules.id} and ${classSessions.deleted} = false)`,
          ),
        );
    }

    const removedClasses =
      created.classes.length === 0
        ? []
        : await tx
            .update(classes)
            .set({ deleted: true })
            .where(
              and(
                inArray(classes.id, created.classes),
                eq(classes.deleted, false),
                sql`not exists (select 1 from ${classSessions} where ${classSessions.classId} = ${classes.id} and ${classSessions.deleted} = false)`,
              ),
            )
            .returning({ n: ONE });

    const removedStudents =
      created.students.length === 0
        ? []
        : await tx
            .update(students)
            .set({ deleted: true })
            .where(
              and(
                inArray(students.id, created.students),
                eq(students.deleted, false),
                sql`not exists (select 1 from ${attendanceLogs} where ${attendanceLogs.studentId} = ${students.id} and ${attendanceLogs.deleted} = false)`,
              ),
            )
            .returning({ id: students.id });

    // A section link goes away together with its student.
    const removedStudentIds = new Set(removedStudents.map((row) => row.id));
    const linksToRemove = created.sectionLinks.filter((link) => removedStudentIds.has(link.studentId));
    for (const part of chunk(linksToRemove, 1000)) {
      const tuples = sql.join(
        part.map((link) => sql`(${link.sectionId}, ${link.studentId})`),
        sql`, `,
      );
      await tx.execute(
        sql`update ${sectionStudents} set "deleted" = true where (${sectionStudents.classSectionId}, ${sectionStudents.studentId}) in (${tuples})`,
      );
    }

    const removedSections =
      created.sections.length === 0
        ? []
        : await tx
            .update(classSections)
            .set({ deleted: true })
            .where(
              and(
                inArray(classSections.id, created.sections),
                eq(classSections.deleted, false),
                sql`not exists (select 1 from ${classes} where ${classes.classSectionId} = ${classSections.id} and ${classes.deleted} = false)`,
              ),
            )
            .returning({ n: ONE });

    const removedSubjects =
      created.subjects.length === 0
        ? []
        : await tx
            .update(subjects)
            .set({ deleted: true })
            .where(
              and(
                inArray(subjects.id, created.subjects),
                eq(subjects.deleted, false),
                sql`not exists (select 1 from ${classes} where ${classes.subjectId} = ${subjects.id} and ${classes.deleted} = false)`,
              ),
            )
            .returning({ n: ONE });

    await tx.update(importBatches).set({ deleted: true }).where(eq(importBatches.id, batchId));

    return {
      logsRemoved: logs.length,
      sessionsRemoved: sessions.length,
      studentsRemoved: removedStudents.length,
      subjectsRemoved: removedSubjects.length,
      sectionsRemoved: removedSections.length,
      classesRemoved: removedClasses.length,
    };
  });
}

type SoftDeletable = PgTable & { deleted: PgColumn };

// Every table in the system. Clear all sets `deleted = true` on all of them.
const ALL_TABLES: Record<string, SoftDeletable> = {
  attendance_logs: attendanceLogs,
  class_sessions: classSessions,
  class_schedules: classSchedules,
  class_enrollments: classEnrollments,
  section_students: sectionStudents,
  classes,
  class_sections: classSections,
  curriculum_subjects: curriculumSubjects,
  subjects,
  students,
  instructors,
  programs,
  departments,
  rooms,
  buildings,
  calendar_events: calendarEvents,
  calendar_dates: calendarDates,
  terms,
  academic_years: academicYears,
  import_batches: importBatches,
};

export async function clearAllData(db: ImportDb): Promise<{ removed: Record<string, number> }> {
  return db.transaction(async (tx) => {
    const removed: Record<string, number> = {};
    for (const [name, table] of Object.entries(ALL_TABLES)) {
      const [count] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(table)
        .where(eq(table.deleted, false));
      removed[name] = count?.n ?? 0;
      if (removed[name] > 0) {
        await tx.execute(sql`update ${table} set "deleted" = true where "deleted" = false`);
      }
    }
    return { removed };
  });
}
