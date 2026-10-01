/**
 * Hand-made fixture for the analytics tests. It is only ever inserted into an
 * in-memory PGlite database created by the tests. It has no connection to the
 * real database and must stay in this folder.
 *
 * Layout
 *   Sections: A (students Ana, Ben, Carla), B (Dan). Subjects: MATH, ENG.
 *   Classes:  C1 = MATH/A, C2 = ENG/A, C3 = MATH/B
 *
 *   id  date        dow  hour  class  status     records
 *   S1  2026-08-03  Mon  8     C1     held       Ana P, Ben L, Carla A, (deleted student Eve A)
 *   S2  2026-08-05  Wed  10    C2     held       Ana P, Ben A, Carla E
 *   S3  2026-08-10  Mon  8     C1     held       Ana P, Ben L, Carla A
 *   S4  2026-09-07  Mon  8     C3     held       Dan P
 *   S5  2026-09-08  Tue  9     C3     held       Dan A, (soft-deleted log: Ana P)
 *   S6  2026-08-12  Wed  8     C1     cancelled  Ana A  (must never count)
 *
 * Expected, counting only live records on held sessions:
 *   overall      P4 L2 A4 E1  total 11, counted 10 -> attendance 0.6, late 0.2, absence 0.4
 *   Ana  P3                    rate 1
 *   Ben  L2 A1                 rate 2/3
 *   Carla A2 E1                rate 0
 *   Dan  P1 A1                 rate 0.5
 *   low attendance (< 0.8): Carla, Dan, Ben in that order
 */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { pushSchema } from "drizzle-kit/api-postgres";
import * as schema from "@/db/schema";
import type { AnalyticsDb } from "@/server/services/analytics/types";

export type FixtureIds = {
  subjects: { math: number; eng: number };
  sections: { a: number; b: number };
};

export async function createEmptyDb(): Promise<AnalyticsDb> {
  const db = drizzle({ client: new PGlite() });
  const { apply } = await pushSchema(schema, db);
  await apply();
  return db;
}

type AttendanceStatus = "present" | "late" | "absent" | "excused";

type DayInfo = {
  date: string;
  dow: number;
  dayName: string;
  isoWeek: number;
  monthNum: number;
  monthName: string;
};

const DAYS: DayInfo[] = [
  { date: "2026-08-03", dow: 1, dayName: "Monday", isoWeek: 32, monthNum: 8, monthName: "August" },
  { date: "2026-08-05", dow: 3, dayName: "Wednesday", isoWeek: 32, monthNum: 8, monthName: "August" },
  { date: "2026-08-10", dow: 1, dayName: "Monday", isoWeek: 33, monthNum: 8, monthName: "August" },
  { date: "2026-08-12", dow: 3, dayName: "Wednesday", isoWeek: 33, monthNum: 8, monthName: "August" },
  { date: "2026-09-07", dow: 1, dayName: "Monday", isoWeek: 37, monthNum: 9, monthName: "September" },
  { date: "2026-09-08", dow: 2, dayName: "Tuesday", isoWeek: 37, monthNum: 9, monthName: "September" },
];

export async function createFixtureDb(): Promise<{ db: AnalyticsDb; ids: FixtureIds }> {
  const db = await createEmptyDb();

  const [department] = await db
    .insert(schema.departments)
    .values({ code: "TST", name: "Test Department" })
    .returning();
  const [program] = await db
    .insert(schema.programs)
    .values({ departmentId: department.id, code: "TP", name: "Test Program" })
    .returning();
  const [building] = await db
    .insert(schema.buildings)
    .values({ code: "TB", name: "Test Building" })
    .returning();
  const [room] = await db
    .insert(schema.rooms)
    .values({ buildingId: building.id, roomCode: "TB-1", roomType: "lecture", capacity: 40 })
    .returning();
  const [academicYear] = await db
    .insert(schema.academicYears)
    .values({ label: "2026-2027", startDate: "2026-08-01", endDate: "2027-05-31" })
    .returning();
  const [term] = await db
    .insert(schema.terms)
    .values({
      academicYearId: academicYear.id,
      termType: "first_semester",
      startDate: "2026-08-01",
      endDate: "2026-12-15",
    })
    .returning();
  const [instructor] = await db
    .insert(schema.instructors)
    .values({
      departmentId: department.id,
      employeeNo: "E-1",
      firstName: "Ida",
      lastName: "Instructor",
      employmentType: "full_time",
    })
    .returning();

  await db.insert(schema.calendarDates).values(
    DAYS.map((day) => ({
      dateValue: day.date,
      termId: term.id,
      dayOfWeek: day.dow,
      dayName: day.dayName,
      dayOfMonth: Number(day.date.slice(8, 10)),
      isoWeek: day.isoWeek,
      monthNum: day.monthNum,
      monthName: day.monthName,
      quarter: 3,
      year: 2026,
      isWeekend: false,
    })),
  );

  const [math, eng] = await db
    .insert(schema.subjects)
    .values([
      { departmentId: department.id, code: "MATH", title: "Mathematics", subjectType: "major" },
      { departmentId: department.id, code: "ENG", title: "English", subjectType: "general_education" },
    ])
    .returning();
  const [sectionA, sectionB] = await db
    .insert(schema.classSections)
    .values([
      { programId: program.id, termId: term.id, yearLevel: 1, sectionLetter: "A", sectionName: "TP 1-A" },
      { programId: program.id, termId: term.id, yearLevel: 1, sectionLetter: "B", sectionName: "TP 1-B" },
    ])
    .returning();

  const [ana, ben, carla, dan, eve] = await db
    .insert(schema.students)
    .values([
      { programId: program.id, studentNo: "S001", firstName: "Ana", lastName: "Reyes", yearLevel: 1 },
      { programId: program.id, studentNo: "S002", firstName: "Ben", lastName: "Cruz", yearLevel: 1 },
      { programId: program.id, studentNo: "S003", firstName: "Carla", lastName: "Santos", yearLevel: 1 },
      { programId: program.id, studentNo: "S004", firstName: "Dan", lastName: "Lopez", yearLevel: 1 },
      { programId: program.id, studentNo: "S005", firstName: "Eve", lastName: "Mora", yearLevel: 1, deleted: true },
    ])
    .returning();

  await db.insert(schema.sectionStudents).values([
    { classSectionId: sectionA.id, studentId: ana.id },
    { classSectionId: sectionA.id, studentId: ben.id },
    { classSectionId: sectionA.id, studentId: carla.id },
    { classSectionId: sectionB.id, studentId: dan.id },
  ]);

  const [c1, c2, c3] = await db
    .insert(schema.classes)
    .values([
      { subjectId: math.id, classSectionId: sectionA.id, instructorId: instructor.id, termId: term.id, classCode: "C1" },
      { subjectId: eng.id, classSectionId: sectionA.id, instructorId: instructor.id, termId: term.id, classCode: "C2" },
      { subjectId: math.id, classSectionId: sectionB.id, instructorId: instructor.id, termId: term.id, classCode: "C3" },
    ])
    .returning();

  const schedules = await db
    .insert(schema.classSchedules)
    .values(
      [c1, c2, c3].map((cls) => ({
        classId: cls.id,
        roomId: room.id,
        meetingType: "lecture" as const,
        dayOfWeek: 1,
        startTime: "08:00:00",
        endTime: "09:00:00",
      })),
    )
    .returning();
  const scheduleOf = (classId: number): number => {
    const found = schedules.find((s) => s.classId === classId);
    if (!found) throw new Error(`fixture: no schedule for class ${classId}`);
    return found.id;
  };

  type SessionSeed = {
    day: DayInfo;
    hour: number;
    classId: number;
    status: "held" | "cancelled";
    weekStart: string;
  };
  const sessionSeeds: SessionSeed[] = [
    { day: DAYS[0], hour: 8, classId: c1.id, status: "held", weekStart: "2026-08-03" },
    { day: DAYS[1], hour: 10, classId: c2.id, status: "held", weekStart: "2026-08-03" },
    { day: DAYS[2], hour: 8, classId: c1.id, status: "held", weekStart: "2026-08-10" },
    { day: DAYS[4], hour: 8, classId: c3.id, status: "held", weekStart: "2026-09-07" },
    { day: DAYS[5], hour: 9, classId: c3.id, status: "held", weekStart: "2026-09-07" },
    { day: DAYS[3], hour: 8, classId: c1.id, status: "cancelled", weekStart: "2026-08-10" },
  ];
  const [s1, s2, s3, s4, s5, s6] = await db
    .insert(schema.classSessions)
    .values(
      sessionSeeds.map((seed) => ({
        classId: seed.classId,
        classScheduleId: scheduleOf(seed.classId),
        roomId: room.id,
        sessionDate: seed.day.date,
        scheduledStart: new Date(`${seed.day.date}T${String(seed.hour).padStart(2, "0")}:00:00`),
        scheduledEnd: new Date(`${seed.day.date}T${String(seed.hour + 1).padStart(2, "0")}:00:00`),
        sessionStatus: seed.status,
        startHour: seed.hour,
        dayOfWeek: seed.day.dow,
        weekStart: seed.weekStart,
        monthStart: `${seed.day.date.slice(0, 7)}-01`,
      })),
    )
    .returning();

  const log = (
    sessionId: number,
    studentId: number,
    status: AttendanceStatus,
    deleted = false,
  ) => ({ sessionId, studentId, status, deleted });

  await db.insert(schema.attendanceLogs).values([
    log(s1.id, ana.id, "present"),
    log(s1.id, ben.id, "late"),
    log(s1.id, carla.id, "absent"),
    log(s1.id, eve.id, "absent"), // deleted student
    log(s2.id, ana.id, "present"),
    log(s2.id, ben.id, "absent"),
    log(s2.id, carla.id, "excused"),
    log(s3.id, ana.id, "present"),
    log(s3.id, ben.id, "late"),
    log(s3.id, carla.id, "absent"),
    log(s4.id, dan.id, "present"),
    log(s5.id, dan.id, "absent"),
    log(s5.id, ana.id, "present", true), // soft-deleted log
    log(s6.id, ana.id, "absent"), // cancelled session
  ]);

  return {
    db,
    ids: {
      subjects: { math: math.id, eng: eng.id },
      sections: { a: sectionA.id, b: sectionB.id },
    },
  };
}
