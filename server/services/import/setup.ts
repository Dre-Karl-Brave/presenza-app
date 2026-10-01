import { and, eq, inArray } from "drizzle-orm";
import {
  academicYears,
  buildings,
  calendarDates,
  departments,
  instructors,
  programs,
  rooms,
  terms,
} from "@/db/schema";
import { chunk, reviveByIds, type Ctx } from "./context";
import {
  academicYearBounds,
  dateParts,
  dayName,
  isoDayOfWeek,
  isoWeekNumber,
  monthName,
  termSlotFor,
} from "./dates";

// ---- Default records (the template has no program, instructor or room) ----

export type Defaults = {
  departmentId: number;
  programId: number;
  instructorId: number;
  roomId: number;
};

export async function ensureDefaults(ctx: Ctx): Promise<Defaults> {
  const { tx } = ctx;

  let [department] = await tx.select().from(departments).where(eq(departments.code, "IMP"));
  if (!department) {
    [department] = await tx
      .insert(departments)
      .values({ code: "IMP", name: "Imported" })
      .returning();
  } else if (department.deleted) await reviveByIds(ctx, departments, [department.id]);

  let [program] = await tx.select().from(programs).where(eq(programs.code, "IMP"));
  if (!program) {
    [program] = await tx
      .insert(programs)
      .values({ departmentId: department.id, code: "IMP", name: "Imported students" })
      .returning();
  } else if (program.deleted) await reviveByIds(ctx, programs, [program.id]);

  let [instructor] = await tx.select().from(instructors).where(eq(instructors.employeeNo, "IMPORT"));
  if (!instructor) {
    [instructor] = await tx
      .insert(instructors)
      .values({
        departmentId: department.id,
        employeeNo: "IMPORT",
        firstName: "Unassigned",
        lastName: "Instructor",
        employmentType: "full_time",
      })
      .returning();
  } else if (instructor.deleted) await reviveByIds(ctx, instructors, [instructor.id]);

  let [building] = await tx.select().from(buildings).where(eq(buildings.code, "IMP"));
  if (!building) {
    [building] = await tx.insert(buildings).values({ code: "IMP", name: "Imported" }).returning();
  } else if (building.deleted) await reviveByIds(ctx, buildings, [building.id]);

  let [room] = await tx.select().from(rooms).where(eq(rooms.roomCode, "IMP-1"));
  if (!room) {
    [room] = await tx
      .insert(rooms)
      .values({ buildingId: building.id, roomCode: "IMP-1", roomType: "other", capacity: 40 })
      .returning();
  } else if (room.deleted) await reviveByIds(ctx, rooms, [room.id]);

  return {
    departmentId: department.id,
    programId: program.id,
    instructorId: instructor.id,
    roomId: room.id,
  };
}

// ---- Terms ----

type TermRow = typeof terms.$inferSelect;

// Never rejects a date. Order: a live term covering the date; else the term for
// that period (revived if deleted, extended to cover the date); else a new one.
export async function resolveTerms(ctx: Ctx, dates: string[]): Promise<Map<string, TermRow>> {
  const { tx } = ctx;
  const allTerms: TermRow[] = await tx.select().from(terms);
  const result = new Map<string, TermRow>();

  for (const date of dates) {
    const covering = allTerms.find((term) => !term.deleted && term.startDate <= date && date <= term.endDate);
    if (covering) {
      result.set(date, covering);
      continue;
    }

    const slot = termSlotFor(date);
    let [year] = await tx.select().from(academicYears).where(eq(academicYears.label, slot.academicYearLabel));
    if (!year) {
      const bounds = academicYearBounds(slot.academicYearLabel);
      [year] = await tx
        .insert(academicYears)
        .values({ label: slot.academicYearLabel, ...bounds })
        .returning();
    } else if (year.deleted) await reviveByIds(ctx, academicYears, [year.id]);

    const existing = allTerms.find((term) => term.academicYearId === year.id && term.termType === slot.termType);
    let term: TermRow;
    if (existing) {
      if (existing.deleted) await reviveByIds(ctx, terms, [existing.id]);
      const startDate = date < existing.startDate ? date : existing.startDate;
      const endDate = date > existing.endDate ? date : existing.endDate;
      [term] = await tx
        .update(terms)
        .set({ deleted: false, startDate, endDate })
        .where(eq(terms.id, existing.id))
        .returning();
      allTerms.splice(allTerms.indexOf(existing), 1, term);
    } else {
      [term] = await tx
        .insert(terms)
        .values({
          academicYearId: year.id,
          termType: slot.termType,
          startDate: slot.startDate,
          endDate: slot.endDate,
        })
        .returning();
      allTerms.push(term);
    }
    result.set(date, term);
  }
  return result;
}

// ---- Calendar dates (one row per class day, referenced by sessions) ----

export async function ensureCalendarDates(
  ctx: Ctx,
  termByDate: Map<string, TermRow>,
): Promise<void> {
  const { tx } = ctx;
  const dates = [...termByDate.keys()];
  const existing: { dateValue: string; deleted: boolean }[] = [];
  for (const part of chunk(dates, 5000)) {
    existing.push(
      ...(await tx
        .select({ dateValue: calendarDates.dateValue, deleted: calendarDates.deleted })
        .from(calendarDates)
        .where(inArray(calendarDates.dateValue, part))),
    );
  }

  const known = new Set(existing.map((row) => row.dateValue));
  const deletedDates = existing.filter((row) => row.deleted).map((row) => row.dateValue);
  for (const part of chunk(deletedDates, 5000)) {
    await tx
      .update(calendarDates)
      .set({ deleted: false })
      .where(and(inArray(calendarDates.dateValue, part)));
  }
  ctx.summary.revived += deletedDates.length;

  const missing = dates.filter((date) => !known.has(date));
  for (const part of chunk(missing, 1000)) {
    await tx.insert(calendarDates).values(
      part.map((date) => {
        const { year, month, day, quarter } = dateParts(date);
        const dayOfWeek = isoDayOfWeek(date);
        return {
          dateValue: date,
          termId: termByDate.get(date)?.id ?? null,
          dayOfWeek,
          dayName: dayName(dayOfWeek),
          dayOfMonth: day,
          isoWeek: isoWeekNumber(date),
          monthNum: month,
          monthName: monthName(month),
          quarter,
          year,
          isWeekend: dayOfWeek >= 6,
          isClassDay: true,
        };
      }),
    );
  }
}
