import { and, between, inArray, sql } from "drizzle-orm";
import {
  classSchedules,
  classSections,
  classSessions,
  classes,
  sectionStudents,
  students,
  subjects,
} from "@/db/schema";
import { chunk, reviveByIds, type Ctx } from "./context";
import { dateParts, formatTime, isoDayOfWeek, monthStart, parseTime, weekStart, wallClock } from "./dates";
import type { Defaults } from "./setup";

export type GetDefaults = () => Promise<Defaults>;

// ---- Subjects ----

export async function ensureSubjects(
  ctx: Ctx,
  getDefaults: GetDefaults,
  codes: string[],
): Promise<Map<string, number>> {
  const { tx } = ctx;
  const found: { id: number; code: string; deleted: boolean }[] = [];
  for (const part of chunk(codes, 5000)) {
    found.push(
      ...(await tx
        .select({ id: subjects.id, code: subjects.code, deleted: subjects.deleted })
        .from(subjects)
        .where(inArray(subjects.code, part))),
    );
  }
  const result = new Map(found.map((row) => [row.code, row.id]));
  await reviveByIds(ctx, subjects, found.filter((row) => row.deleted).map((row) => row.id));

  const missing = codes.filter((code) => !result.has(code));
  if (missing.length > 0) {
    const { departmentId } = await getDefaults();
    const inserted = await tx
      .insert(subjects)
      .values(missing.map((code) => ({ departmentId, code, title: code, subjectType: "major" as const })))
      .returning({ id: subjects.id, code: subjects.code });
    for (const row of inserted) {
      result.set(row.code, row.id);
      ctx.created.subjects.push(row.id);
    }
    ctx.summary.subjectsCreated += inserted.length;
  }
  return result;
}

// ---- Sections ----

export const sectionKey = (termId: number, name: string) => `${termId}|${name.toLowerCase()}`;

function sectionParts(name: string): { yearLevel: number; letter: string } {
  const digit = /\d/.exec(name);
  const lastWord = name.split(/[-\s]+/).filter(Boolean).pop() ?? name;
  return { yearLevel: digit ? Number(digit[0]) : 1, letter: lastWord.slice(0, 5) };
}

export async function ensureSections(
  ctx: Ctx,
  getDefaults: GetDefaults,
  wanted: { termId: number; name: string }[],
): Promise<Map<string, number>> {
  const { tx } = ctx;
  const termIds = [...new Set(wanted.map((item) => item.termId))];
  const existing = await tx.select().from(classSections).where(inArray(classSections.termId, termIds));

  const result = new Map<string, number>();
  const occupied = new Set<string>();
  const toRevive: number[] = [];
  for (const row of existing) {
    occupied.add(`${row.programId}|${row.termId}|${row.yearLevel}|${row.sectionLetter}`);
    result.set(sectionKey(row.termId, row.sectionName), row.id);
  }
  for (const item of wanted) {
    const id = result.get(sectionKey(item.termId, item.name));
    if (id !== undefined && existing.find((row) => row.id === id)?.deleted) toRevive.push(id);
  }
  await reviveByIds(ctx, classSections, [...new Set(toRevive)]);

  const missing = new Map<string, { termId: number; name: string }>();
  for (const item of wanted) {
    const key = sectionKey(item.termId, item.name);
    if (!result.has(key) && !missing.has(key)) missing.set(key, item);
  }
  if (missing.size > 0) {
    const { programId } = await getDefaults();
    const values = [...missing.values()].map((item) => {
      const { yearLevel, letter: baseLetter } = sectionParts(item.name);
      let letter = baseLetter;
      let attempt = 1;
      while (occupied.has(`${programId}|${item.termId}|${yearLevel}|${letter}`)) {
        attempt += 1;
        letter = baseLetter.slice(0, Math.max(1, 5 - String(attempt).length)) + attempt;
      }
      occupied.add(`${programId}|${item.termId}|${yearLevel}|${letter}`);
      return {
        programId,
        termId: item.termId,
        yearLevel,
        sectionLetter: letter,
        sectionName: item.name,
      };
    });
    const inserted = await tx
      .insert(classSections)
      .values(values)
      .returning({ id: classSections.id, termId: classSections.termId, name: classSections.sectionName });
    for (const row of inserted) {
      result.set(sectionKey(row.termId, row.name), row.id);
      ctx.created.sections.push(row.id);
    }
    ctx.summary.sectionsCreated += inserted.length;
  }
  return result;
}

// ---- Classes (subject + section + term) ----

export const classKey = (subjectId: number, sectionId: number, termId: number) =>
  `${subjectId}|${sectionId}|${termId}`;

export type WantedClass = {
  subjectId: number;
  sectionId: number;
  termId: number;
  subjectCode: string;
  sectionName: string;
  termTag: string;
};

function makeClassCode(item: WantedClass, used: Set<string>): string {
  const tail = `-${item.termTag}`;
  const base = `${item.subjectCode}-${item.sectionName.replace(/[^A-Za-z0-9]/g, "")}`;
  let code = base.slice(0, 20 - tail.length) + tail;
  let attempt = 0;
  while (used.has(code)) {
    attempt += 1;
    const suffix = String(attempt);
    code = base.slice(0, 20 - tail.length - suffix.length) + suffix + tail;
  }
  used.add(code);
  return code;
}

export async function ensureClasses(
  ctx: Ctx,
  getDefaults: GetDefaults,
  wanted: WantedClass[],
): Promise<Map<string, number>> {
  const { tx } = ctx;
  const subjectIds = [...new Set(wanted.map((item) => item.subjectId))];
  const existing = [];
  for (const part of chunk(subjectIds, 5000)) {
    existing.push(...(await tx.select().from(classes).where(inArray(classes.subjectId, part))));
  }
  const byKey = new Map(existing.map((row) => [classKey(row.subjectId, row.classSectionId, row.termId), row]));

  const result = new Map<string, number>();
  const toRevive: number[] = [];
  const missing = new Map<string, WantedClass>();
  for (const item of wanted) {
    const key = classKey(item.subjectId, item.sectionId, item.termId);
    const row = byKey.get(key);
    if (row) {
      result.set(key, row.id);
      if (row.deleted) toRevive.push(row.id);
    } else if (!missing.has(key)) missing.set(key, item);
  }
  await reviveByIds(ctx, classes, [...new Set(toRevive)]);

  if (missing.size > 0) {
    const { instructorId } = await getDefaults();
    const used = new Set((await tx.select({ code: classes.classCode }).from(classes)).map((row) => row.code));
    const entries = [...missing.entries()].map(([key, item]) => ({
      key,
      value: {
        subjectId: item.subjectId,
        classSectionId: item.sectionId,
        instructorId,
        termId: item.termId,
        classCode: makeClassCode(item, used),
      },
    }));
    const inserted = await tx
      .insert(classes)
      .values(entries.map((entry) => entry.value))
      .returning({ id: classes.id, code: classes.classCode });
    const idByCode = new Map(inserted.map((row) => [row.code, row.id]));
    for (const entry of entries) {
      const id = idByCode.get(entry.value.classCode);
      if (id === undefined) continue;
      result.set(entry.key, id);
      ctx.created.classes.push(id);
    }
    ctx.summary.classesCreated += inserted.length;
  }
  return result;
}

// ---- Schedules (class + weekday) ----

export type ScheduleInfo = { id: number; roomId: number; start: number; end: number };
export const scheduleKey = (classId: number, dayOfWeek: number) => `${classId}|${dayOfWeek}`;

export type WantedSchedule = {
  classId: number;
  dayOfWeek: number;
  start: number;
  end: number;
  inferred: boolean;
};

export async function ensureSchedules(
  ctx: Ctx,
  getDefaults: GetDefaults,
  wanted: WantedSchedule[],
): Promise<Map<string, ScheduleInfo>> {
  const { tx } = ctx;
  const classIds = [...new Set(wanted.map((item) => item.classId))];
  const existing = [];
  for (const part of chunk(classIds, 5000)) {
    existing.push(...(await tx.select().from(classSchedules).where(inArray(classSchedules.classId, part))));
  }

  const result = new Map<string, ScheduleInfo>();
  const toRevive: number[] = [];
  const missing: WantedSchedule[] = [];
  for (const item of wanted) {
    const candidates = existing
      .filter((row) => row.classId === item.classId && row.dayOfWeek === item.dayOfWeek)
      .sort((a, b) => Number(a.deleted) - Number(b.deleted) || a.startTime.localeCompare(b.startTime));
    const chosen = candidates[0];
    if (chosen) {
      if (chosen.deleted) toRevive.push(chosen.id);
      result.set(scheduleKey(item.classId, item.dayOfWeek), {
        id: chosen.id,
        roomId: chosen.roomId,
        start: parseTime(chosen.startTime) ?? item.start,
        end: parseTime(chosen.endTime) ?? item.end,
      });
    } else {
      missing.push(item);
    }
  }
  await reviveByIds(ctx, classSchedules, [...new Set(toRevive)]);

  if (missing.length > 0) {
    const { roomId } = await getDefaults();
    const inserted = await tx
      .insert(classSchedules)
      .values(
        missing.map((item) => ({
          classId: item.classId,
          roomId,
          meetingType: "lecture" as const,
          dayOfWeek: item.dayOfWeek,
          startTime: formatTime(item.start),
          endTime: formatTime(item.end),
        })),
      )
      .returning({ id: classSchedules.id, classId: classSchedules.classId, dayOfWeek: classSchedules.dayOfWeek });
    for (const row of inserted) {
      const item = missing.find((m) => m.classId === row.classId && m.dayOfWeek === row.dayOfWeek);
      if (!item) continue;
      result.set(scheduleKey(row.classId, row.dayOfWeek), {
        id: row.id,
        roomId,
        start: item.start,
        end: item.end,
      });
      ctx.created.schedules.push(row.id);
      if (item.inferred) ctx.summary.schedulesInferred += 1;
    }
  }
  return result;
}

// ---- Sessions (class + date) ----

export type SessionInfo = { id: number; cancelled: boolean };
export const sessionKey = (classId: number, date: string) => `${classId}|${date}`;

export async function ensureSessions(
  ctx: Ctx,
  wanted: { classId: number; date: string; schedule: ScheduleInfo }[],
): Promise<Map<string, SessionInfo>> {
  const { tx } = ctx;
  const classIds = [...new Set(wanted.map((item) => item.classId))];
  const dates = wanted.map((item) => item.date).sort();
  const existing = [];
  for (const part of chunk(classIds, 2000)) {
    existing.push(
      ...(await tx
        .select()
        .from(classSessions)
        .where(
          and(
            inArray(classSessions.classId, part),
            between(classSessions.sessionDate, dates[0], dates[dates.length - 1]),
          ),
        )),
    );
  }
  const byKey = new Map(existing.map((row) => [sessionKey(row.classId, row.sessionDate), row]));

  const result = new Map<string, SessionInfo>();
  const toRevive: number[] = [];
  const missing = new Map<string, (typeof wanted)[number]>();
  for (const item of wanted) {
    const key = sessionKey(item.classId, item.date);
    const row = byKey.get(key);
    if (row) {
      result.set(key, { id: row.id, cancelled: row.sessionStatus === "cancelled" });
      if (row.deleted) toRevive.push(row.id);
    } else if (!missing.has(key)) {
      missing.set(key, item);
    }
  }
  await reviveByIds(ctx, classSessions, [...new Set(toRevive)]);

  const items = [...missing.values()];
  for (const part of chunk(items, 1000)) {
    const inserted = await tx
      .insert(classSessions)
      .values(
        part.map((item) => ({
          classId: item.classId,
          classScheduleId: item.schedule.id,
          roomId: item.schedule.roomId,
          sessionDate: item.date,
          scheduledStart: wallClock(item.date, item.schedule.start),
          scheduledEnd: wallClock(item.date, item.schedule.end),
          sessionStatus: "held" as const,
          startHour: Math.floor(item.schedule.start / 60),
          dayOfWeek: isoDayOfWeek(item.date),
          weekStart: weekStart(item.date),
          monthStart: monthStart(item.date),
        })),
      )
      .returning({ id: classSessions.id, classId: classSessions.classId, date: classSessions.sessionDate });
    for (const row of inserted) {
      result.set(sessionKey(row.classId, row.date), { id: row.id, cancelled: false });
      ctx.created.sessions.push(row.id);
    }
    ctx.summary.sessionsCreated += inserted.length;
  }
  return result;
}

// ---- Students and section links ----

export async function ensureStudents(
  ctx: Ctx,
  getDefaults: GetDefaults,
  wanted: { studentNo: string; firstName: string; lastName: string }[],
): Promise<Map<string, number>> {
  const { tx } = ctx;
  const numbers = [...new Set(wanted.map((item) => item.studentNo))];
  const found: { id: number; studentNo: string; deleted: boolean }[] = [];
  for (const part of chunk(numbers, 5000)) {
    found.push(
      ...(await tx
        .select({ id: students.id, studentNo: students.studentNo, deleted: students.deleted })
        .from(students)
        .where(inArray(students.studentNo, part))),
    );
  }
  const result = new Map(found.map((row) => [row.studentNo, row.id]));
  await reviveByIds(ctx, students, found.filter((row) => row.deleted).map((row) => row.id));

  const missing = new Map<string, (typeof wanted)[number]>();
  for (const item of wanted) {
    if (!result.has(item.studentNo) && !missing.has(item.studentNo)) missing.set(item.studentNo, item);
  }
  if (missing.size > 0) {
    const { programId } = await getDefaults();
    for (const part of chunk([...missing.values()], 1000)) {
      const inserted = await tx
        .insert(students)
        .values(
          part.map((item) => ({
            programId,
            studentNo: item.studentNo,
            firstName: item.firstName,
            lastName: item.lastName,
            yearLevel: 1,
          })),
        )
        .returning({ id: students.id, studentNo: students.studentNo });
      for (const row of inserted) {
        result.set(row.studentNo, row.id);
        ctx.created.students.push(row.id);
      }
      ctx.summary.studentsCreated += inserted.length;
    }
  }
  return result;
}

export async function ensureSectionLinks(
  ctx: Ctx,
  pairs: { sectionId: number; studentId: number }[],
): Promise<void> {
  const { tx } = ctx;
  const unique = new Map(pairs.map((pair) => [`${pair.sectionId}|${pair.studentId}`, pair]));
  const sectionIds = [...new Set(pairs.map((pair) => pair.sectionId))];

  const existing = new Map<string, boolean>(); // key -> deleted
  for (const part of chunk(sectionIds, 2000)) {
    const rows = await tx.select().from(sectionStudents).where(inArray(sectionStudents.classSectionId, part));
    for (const row of rows) existing.set(`${row.classSectionId}|${row.studentId}`, row.deleted);
  }

  const toRevive = [...unique.entries()].filter(([key]) => existing.get(key) === true).map(([, pair]) => pair);
  for (const part of chunk(toRevive, 1000)) {
    const tuples = sql.join(
      part.map((pair) => sql`(${pair.sectionId}, ${pair.studentId})`),
      sql`, `,
    );
    await tx.execute(
      sql`update ${sectionStudents} set "deleted" = false where (${sectionStudents.classSectionId}, ${sectionStudents.studentId}) in (${tuples})`,
    );
  }
  ctx.summary.revived += toRevive.length;

  const toCreate = [...unique.entries()].filter(([key]) => !existing.has(key)).map(([, pair]) => pair);
  for (const part of chunk(toCreate, 2000)) {
    await tx
      .insert(sectionStudents)
      .values(part.map((pair) => ({ classSectionId: pair.sectionId, studentId: pair.studentId })));
  }
  ctx.created.sectionLinks.push(...toCreate);
}

export function termTag(startDate: string, termType: "first_semester" | "second_semester" | "summer"): string {
  const suffix = termType === "first_semester" ? "S1" : termType === "second_semester" ? "S2" : "SU";
  return `${String(dateParts(startDate).year).slice(2)}${suffix}`;
}
