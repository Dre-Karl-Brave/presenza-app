import { eq, inArray, sql } from "drizzle-orm";
import { attendanceLogs, emptyCreatedIds, importBatches } from "@/db/schema";
import { chunk, type Ctx, type Tx } from "./context";
import { isoDayOfWeek, roundToHalfHour, wallClock } from "./dates";
import {
  classKey,
  ensureClasses,
  ensureSchedules,
  ensureSectionLinks,
  ensureSessions,
  ensureStudents,
  ensureSubjects,
  ensureSections,
  scheduleKey,
  sectionKey,
  sessionKey,
  termTag,
  type ScheduleInfo,
  type WantedClass,
  type WantedSchedule,
} from "./entities";
import { ensureCalendarDates, ensureDefaults, resolveTerms, type Defaults } from "./setup";
import {
  emptySummary,
  type FileKind,
  type ImportDb,
  type ImportError,
  type ImportRow,
  type ImportSummary,
} from "./types";

export type ImportOptions = {
  fileName: string;
  fileKind: FileKind | "generated";
  rowsRead: number; // rows in the file before validation
  rowsInvalid: number; // rows already rejected by validation
  dryRun?: boolean; // run everything, then roll it back
};

export type ImportResult = {
  batchId: number | null;
  summary: ImportSummary;
  errors: ImportError[]; // rows rejected while importing (e.g. cancelled sessions)
  appliedRows: number;
};

class Rollback extends Error {
  readonly result: ImportResult;
  constructor(result: ImportResult) {
    super("rollback");
    this.result = result;
  }
}

const DEFAULT_START = 8 * 60;
const DEFAULT_LENGTH = 60;
const LAST_MINUTE = 23 * 60 + 59;

function isAttended(row: ImportRow): boolean {
  return row.status === "present" || row.status === "late";
}

// THE entry point. The file importer and (later) the seed both come through here.
export async function importRows(
  db: ImportDb,
  rows: ImportRow[],
  options: ImportOptions,
): Promise<ImportResult> {
  if (rows.length === 0) {
    return { batchId: null, summary: emptySummary(), errors: [], appliedRows: 0 };
  }
  try {
    return await db.transaction(async (tx) => {
      const result = await applyRows(tx, rows, options);
      if (options.dryRun) throw new Rollback(result);
      return result;
    });
  } catch (error) {
    if (error instanceof Rollback) return error.result;
    throw error;
  }
}

type Resolved = {
  row: ImportRow;
  termId: number;
  subjectId: number;
  sectionId: number;
  classId: number;
  dayOfWeek: number;
};

async function applyRows(tx: Tx, rows: ImportRow[], options: ImportOptions): Promise<ImportResult> {
  const ctx: Ctx = { tx, summary: emptySummary(), created: emptyCreatedIds() };

  let defaults: Promise<Defaults> | null = null;
  const getDefaults = () => (defaults ??= ensureDefaults(ctx));

  // Terms and calendar days
  const dates = [...new Set(rows.map((row) => row.date))].sort();
  const termByDate = await resolveTerms(ctx, dates);
  await ensureCalendarDates(ctx, termByDate);
  const termOf = (date: string) => {
    const term = termByDate.get(date);
    if (!term) throw new Error(`No term resolved for ${date}`);
    return term;
  };

  // Subjects, sections, classes
  const subjectIds = await ensureSubjects(ctx, getDefaults, [...new Set(rows.map((row) => row.subjectCode))]);
  const wantedSections = new Map<string, { termId: number; name: string }>();
  for (const row of rows) {
    const termId = termOf(row.date).id;
    wantedSections.set(sectionKey(termId, row.sectionName), { termId, name: row.sectionName });
  }
  const sectionIds = await ensureSections(ctx, getDefaults, [...wantedSections.values()]);

  const wantedClasses = new Map<string, WantedClass>();
  const resolvedBase = rows.map((row) => {
    const term = termOf(row.date);
    const subjectId = subjectIds.get(row.subjectCode);
    const sectionId = sectionIds.get(sectionKey(term.id, row.sectionName));
    if (subjectId === undefined || sectionId === undefined) {
      throw new Error(`Row ${row.rowNumber}: subject or section was not resolved`);
    }
    wantedClasses.set(classKey(subjectId, sectionId, term.id), {
      subjectId,
      sectionId,
      termId: term.id,
      subjectCode: row.subjectCode,
      sectionName: row.sectionName,
      termTag: termTag(term.startDate, term.termType),
    });
    return { row, termId: term.id, subjectId, sectionId };
  });
  const classIds = await ensureClasses(ctx, getDefaults, [...wantedClasses.values()]);

  const resolved: Resolved[] = resolvedBase.map((base) => {
    const classId = classIds.get(classKey(base.subjectId, base.sectionId, base.termId));
    if (classId === undefined) throw new Error(`Row ${base.row.rowNumber}: class was not resolved`);
    return { ...base, classId, dayOfWeek: isoDayOfWeek(base.row.date) };
  });

  // Schedules: file times, else inferred from the earliest time-in
  const groups = new Map<string, Resolved[]>();
  for (const item of resolved) {
    const key = scheduleKey(item.classId, item.dayOfWeek);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  const wantedSchedules: WantedSchedule[] = [];
  for (const group of groups.values()) {
    const withTimes = group.find((item) => item.row.classStart !== null && item.row.classEnd !== null);
    let start: number;
    let end: number;
    let inferred = false;
    if (withTimes && withTimes.row.classStart !== null && withTimes.row.classEnd !== null) {
      start = withTimes.row.classStart;
      end = withTimes.row.classEnd;
    } else {
      const timeIns = group.flatMap((item) => (isAttended(item.row) && item.row.timeIn !== null ? [item.row.timeIn] : []));
      start = timeIns.length > 0 ? roundToHalfHour(Math.min(...timeIns)) : DEFAULT_START;
      end = Math.min(start + DEFAULT_LENGTH, LAST_MINUTE);
      inferred = true;
    }
    wantedSchedules.push({ classId: group[0].classId, dayOfWeek: group[0].dayOfWeek, start, end, inferred });
  }
  const schedules = await ensureSchedules(ctx, getDefaults, wantedSchedules);
  const scheduleOf = (item: Resolved): ScheduleInfo => {
    const schedule = schedules.get(scheduleKey(item.classId, item.dayOfWeek));
    if (!schedule) throw new Error(`Row ${item.row.rowNumber}: schedule was not resolved`);
    return schedule;
  };

  // Sessions
  const wantedSessions = new Map<string, { classId: number; date: string; schedule: ScheduleInfo }>();
  for (const item of resolved) {
    wantedSessions.set(sessionKey(item.classId, item.row.date), {
      classId: item.classId,
      date: item.row.date,
      schedule: scheduleOf(item),
    });
  }
  const sessions = await ensureSessions(ctx, [...wantedSessions.values()]);

  const errors: ImportError[] = [];
  const usable: Resolved[] = [];
  for (const item of resolved) {
    const session = sessions.get(sessionKey(item.classId, item.row.date));
    if (!session || session.cancelled) {
      errors.push({ row: item.row.rowNumber, column: "date", message: "the class session on this date is cancelled" });
    } else {
      usable.push(item);
    }
  }

  // Students and section links
  const studentIds = await ensureStudents(
    ctx,
    getDefaults,
    usable.map((item) => ({
      studentNo: item.row.studentNo,
      firstName: item.row.firstName,
      lastName: item.row.lastName,
    })),
  );
  await ensureSectionLinks(
    ctx,
    usable.flatMap((item) => {
      const studentId = studentIds.get(item.row.studentNo);
      return studentId === undefined ? [] : [{ sectionId: item.sectionId, studentId }];
    }),
  );

  // Batch record, then the attendance logs
  const [batch] = await tx
    .insert(importBatches)
    .values({
      fileName: options.fileName.slice(0, 255),
      fileKind: options.fileKind,
      rowsRead: options.rowsRead,
      rowsImported: usable.length,
      rowsInvalid: options.rowsInvalid + errors.length,
      createdIds: emptyCreatedIds(),
    })
    .returning({ id: importBatches.id });

  type LogValues = typeof attendanceLogs.$inferInsert;
  const desired = new Map<string, LogValues>();
  for (const item of usable) {
    const { row } = item;
    const session = sessions.get(sessionKey(item.classId, row.date));
    const studentId = studentIds.get(row.studentNo);
    if (!session || studentId === undefined) continue;
    const schedule = scheduleOf(item);
    const attended = isAttended(row);
    const timeIn = attended ? row.timeIn : null;
    const timeOut = attended ? row.timeOut : null;
    const minutesLate = !attended
      ? 0
      : (row.minutesLate ??
        (row.status === "late" && timeIn !== null ? Math.max(0, timeIn - schedule.start) : 0));
    desired.set(`${session.id}|${studentId}`, {
      sessionId: session.id,
      studentId,
      status: row.status,
      timeIn: timeIn === null ? null : wallClock(row.date, timeIn),
      timeOut: timeOut === null ? null : wallClock(row.date, timeOut),
      logMethod: "manual",
      leftEarly: timeOut !== null && timeOut < schedule.end,
      minutesLate,
      minutesInClass: timeIn !== null && timeOut !== null ? timeOut - timeIn : null,
      timeInHour: timeIn === null ? null : Math.floor(timeIn / 60),
      timeOutHour: timeOut === null ? null : Math.floor(timeOut / 60),
      importBatchId: batch.id,
    });
  }

  const sessionIdList = [...new Set([...desired.values()].map((value) => value.sessionId))];
  const existingLogs = new Map<string, typeof attendanceLogs.$inferSelect>();
  for (const part of chunk(sessionIdList, 2000)) {
    const found = await tx.select().from(attendanceLogs).where(inArray(attendanceLogs.sessionId, part));
    for (const log of found) existingLogs.set(`${log.sessionId}|${log.studentId}`, log);
  }

  const toInsert: LogValues[] = [];
  const toUpdate: LogValues[] = [];
  for (const [key, value] of desired) {
    const current = existingLogs.get(key);
    if (!current) {
      toInsert.push(value);
      continue;
    }
    const same =
      !current.deleted &&
      current.status === value.status &&
      (current.timeIn?.getTime() ?? null) === (value.timeIn?.getTime() ?? null) &&
      (current.timeOut?.getTime() ?? null) === (value.timeOut?.getTime() ?? null) &&
      current.minutesLate === value.minutesLate &&
      current.leftEarly === value.leftEarly &&
      current.minutesInClass === (value.minutesInClass ?? null) &&
      current.timeInHour === (value.timeInHour ?? null) &&
      current.timeOutHour === (value.timeOutHour ?? null);
    if (same) {
      ctx.summary.logsUnchanged += 1;
      continue;
    }
    if (current.deleted) ctx.summary.revived += 1;
    toUpdate.push(value);
    ctx.summary.logsUpdated += 1;
  }
  for (const part of chunk(toInsert, 1000)) {
    await tx.insert(attendanceLogs).values(part);
  }
  // Changed rows already exist (unique on session_id, student_id), so a chunked
  // upsert replaces what used to be one awaited UPDATE per row.
  for (const part of chunk(toUpdate, 1000)) {
    await tx
      .insert(attendanceLogs)
      .values(part)
      .onConflictDoUpdate({
        target: [attendanceLogs.sessionId, attendanceLogs.studentId],
        set: {
          status: sql`excluded.status`,
          timeIn: sql`excluded.time_in`,
          timeOut: sql`excluded.time_out`,
          logMethod: sql`excluded.log_method`,
          leftEarly: sql`excluded.left_early`,
          minutesLate: sql`excluded.minutes_late`,
          minutesInClass: sql`excluded.minutes_in_class`,
          timeInHour: sql`excluded.time_in_hour`,
          timeOutHour: sql`excluded.time_out_hour`,
          importBatchId: sql`excluded.import_batch_id`,
          deleted: false,
        },
      });
  }
  ctx.summary.logsCreated += toInsert.length;

  await tx
    .update(importBatches)
    .set({
      logsCreated: ctx.summary.logsCreated,
      logsUpdated: ctx.summary.logsUpdated,
      logsUnchanged: ctx.summary.logsUnchanged,
      createdIds: ctx.created,
    })
    .where(eq(importBatches.id, batch.id));

  return { batchId: batch.id, summary: ctx.summary, errors, appliedRows: usable.length };
}
