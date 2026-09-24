import "dotenv/config";
import { db } from "./index";
import {
  academicYears,
  terms,
  calendarDates,
  calendarEvents,
  departments,
  programs,
  buildings,
  rooms,
  instructors,
  students,
  subjects,
  curriculumSubjects,
  classSections,
  sectionStudents,
  classes,
  classSchedules,
  classEnrollments,
  classSessions,
  attendanceLogs,
} from "./schema";

async function main() {
  const [academicYear] = await db
    .insert(academicYears)
    .values({ label: "2026-2027", startDate: "2026-08-01", endDate: "2027-05-31" })
    .returning();

  const [term] = await db
    .insert(terms)
    .values({
      academicYearId: academicYear.id,
      termType: "first_semester",
      startDate: "2026-08-01",
      endDate: "2026-12-15",
    })
    .returning();

  const [calendarDate] = await db
    .insert(calendarDates)
    .values({
      dateValue: "2026-08-17",
      termId: term.id,
      dayOfWeek: 1,
      dayName: "Monday",
      dayOfMonth: 17,
      isoWeek: 34,
      weekOfTerm: 1,
      monthNum: 8,
      monthName: "August",
      quarter: 3,
      year: 2026,
      isWeekend: false,
      isClassDay: true,
    })
    .returning();

  const [calendarEvent] = await db
    .insert(calendarEvents)
    .values({
      eventDate: calendarDate.dateValue,
      eventType: "school_event",
      name: "Orientation Day",
      classesCancelled: false,
    })
    .returning();

  const [department] = await db
    .insert(departments)
    .values({ code: "CCS", name: "College of Computer Studies" })
    .returning();

  const [program] = await db
    .insert(programs)
    .values({
      departmentId: department.id,
      code: "BSIT",
      name: "BS Information Technology",
      yearsToComplete: 4,
    })
    .returning();

  const [building] = await db
    .insert(buildings)
    .values({ code: "MB", name: "Main Building" })
    .returning();

  const [room] = await db
    .insert(rooms)
    .values({
      buildingId: building.id,
      roomCode: "MB-301",
      roomType: "computer_laboratory",
      floor: 3,
      capacity: 40,
    })
    .returning();

  const [instructor] = await db
    .insert(instructors)
    .values({
      departmentId: department.id,
      employeeNo: "EMP-0001",
      firstName: "Jane",
      lastName: "Cruz",
      employmentType: "full_time",
    })
    .returning();

  const [student] = await db
    .insert(students)
    .values({
      programId: program.id,
      studentNo: "2026-00123",
      firstName: "Juan",
      lastName: "Dela Cruz",
      sex: "male",
      yearLevel: 3,
      studentType: "regular",
      residenceType: "commuter",
      status: "active",
    })
    .returning();

  const [subject] = await db
    .insert(subjects)
    .values({
      departmentId: department.id,
      code: "IT301",
      title: "Data Structures",
      subjectType: "major",
      lectureUnits: 3,
      labUnits: 1,
    })
    .returning();

  const [curriculumSubject] = await db
    .insert(curriculumSubjects)
    .values({
      programId: program.id,
      subjectId: subject.id,
      yearLevel: 3,
      termType: "first_semester",
    })
    .returning();

  const [classSection] = await db
    .insert(classSections)
    .values({
      programId: program.id,
      termId: term.id,
      yearLevel: 3,
      sectionLetter: "A",
      sectionName: "BSIT 3-A",
      shift: "day",
      adviserId: instructor.id,
    })
    .returning();

  const [sectionStudent] = await db
    .insert(sectionStudents)
    .values({ classSectionId: classSection.id, studentId: student.id })
    .returning();

  const [classRow] = await db
    .insert(classes)
    .values({
      subjectId: subject.id,
      classSectionId: classSection.id,
      instructorId: instructor.id,
      termId: term.id,
      classCode: "IT301-3A-26S1",
      graceMinutes: 15,
      maxAbsences: 7,
    })
    .returning();

  const [classSchedule] = await db
    .insert(classSchedules)
    .values({
      classId: classRow.id,
      roomId: room.id,
      meetingType: "lecture",
      dayOfWeek: 1,
      startTime: "09:00:00",
      endTime: "10:00:00",
    })
    .returning();

  const [classEnrollment] = await db
    .insert(classEnrollments)
    .values({ classId: classRow.id, studentId: student.id, enrolledOn: "2026-08-01" })
    .returning();

  const [classSession] = await db
    .insert(classSessions)
    .values({
      classId: classRow.id,
      classScheduleId: classSchedule.id,
      roomId: room.id,
      sessionDate: calendarDate.dateValue,
      scheduledStart: new Date("2026-08-17T09:00:00"),
      scheduledEnd: new Date("2026-08-17T10:00:00"),
      sessionStatus: "held",
      startHour: 9,
      weekStart: "2026-08-17",
      monthStart: "2026-08-01",
    })
    .returning();

  const [attendanceLog] = await db
    .insert(attendanceLogs)
    .values({
      sessionId: classSession.id,
      studentId: student.id,
      status: "present",
      timeIn: new Date("2026-08-17T08:58:00"),
      timeOut: new Date("2026-08-17T10:00:00"),
      logMethod: "rfid_card",
      leftEarly: false,
      minutesLate: 0,
      minutesInClass: 62,
      timeInHour: 8,
      timeOutHour: 10,
    })
    .returning();

  console.log("Seeded 1 row per table:", {
    academicYear,
    term,
    calendarDate,
    calendarEvent,
    department,
    program,
    building,
    room,
    instructor,
    student,
    subject,
    curriculumSubject,
    classSection,
    sectionStudent,
    class: classRow,
    classSchedule,
    classEnrollment,
    classSession,
    attendanceLog,
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
