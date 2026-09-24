import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const dbRelations = defineRelations(schema, (r) => ({
  academicYears: {
    terms: r.many.terms({
      from: r.academicYears.id,
      to: r.terms.academicYearId,
    }),
  },

  terms: {
    academicYear: r.one.academicYears({
      from: r.terms.academicYearId,
      to: r.academicYears.id,
      optional: false,
    }),
    calendarDates: r.many.calendarDates({
      from: r.terms.id,
      to: r.calendarDates.termId,
    }),
    classSections: r.many.classSections({
      from: r.terms.id,
      to: r.classSections.termId,
    }),
    classes: r.many.classes({
      from: r.terms.id,
      to: r.classes.termId,
    }),
  },

  calendarDates: {
    term: r.one.terms({
      from: r.calendarDates.termId,
      to: r.terms.id,
      optional: true,
    }),
    events: r.many.calendarEvents({
      from: r.calendarDates.dateValue,
      to: r.calendarEvents.eventDate,
    }),
    sessions: r.many.classSessions({
      from: r.calendarDates.dateValue,
      to: r.classSessions.sessionDate,
    }),
  },

  calendarEvents: {
    calendarDate: r.one.calendarDates({
      from: r.calendarEvents.eventDate,
      to: r.calendarDates.dateValue,
      optional: false,
    }),
  },

  departments: {
    programs: r.many.programs({
      from: r.departments.id,
      to: r.programs.departmentId,
    }),
    instructors: r.many.instructors({
      from: r.departments.id,
      to: r.instructors.departmentId,
    }),
    subjects: r.many.subjects({
      from: r.departments.id,
      to: r.subjects.departmentId,
    }),
  },

  programs: {
    department: r.one.departments({
      from: r.programs.departmentId,
      to: r.departments.id,
      optional: false,
    }),
    students: r.many.students({
      from: r.programs.id,
      to: r.students.programId,
    }),
    curriculumSubjects: r.many.curriculumSubjects({
      from: r.programs.id,
      to: r.curriculumSubjects.programId,
    }),
    classSections: r.many.classSections({
      from: r.programs.id,
      to: r.classSections.programId,
    }),
  },

  buildings: {
    rooms: r.many.rooms({
      from: r.buildings.id,
      to: r.rooms.buildingId,
    }),
  },

  rooms: {
    building: r.one.buildings({
      from: r.rooms.buildingId,
      to: r.buildings.id,
      optional: false,
    }),
    schedules: r.many.classSchedules({
      from: r.rooms.id,
      to: r.classSchedules.roomId,
    }),
    sessions: r.many.classSessions({
      from: r.rooms.id,
      to: r.classSessions.roomId,
    }),
  },

  instructors: {
    department: r.one.departments({
      from: r.instructors.departmentId,
      to: r.departments.id,
      optional: false,
    }),
    advisedSections: r.many.classSections({
      from: r.instructors.id,
      to: r.classSections.adviserId,
    }),
    classes: r.many.classes({
      from: r.instructors.id,
      to: r.classes.instructorId,
    }),
  },

  students: {
    program: r.one.programs({
      from: r.students.programId,
      to: r.programs.id,
      optional: false,
    }),
    sectionStudents: r.many.sectionStudents({
      from: r.students.id,
      to: r.sectionStudents.studentId,
    }),
    classEnrollments: r.many.classEnrollments({
      from: r.students.id,
      to: r.classEnrollments.studentId,
    }),
    attendanceLogs: r.many.attendanceLogs({
      from: r.students.id,
      to: r.attendanceLogs.studentId,
    }),
  },

  subjects: {
    department: r.one.departments({
      from: r.subjects.departmentId,
      to: r.departments.id,
      optional: false,
    }),
    curriculumSubjects: r.many.curriculumSubjects({
      from: r.subjects.id,
      to: r.curriculumSubjects.subjectId,
    }),
    classes: r.many.classes({
      from: r.subjects.id,
      to: r.classes.subjectId,
    }),
  },

  curriculumSubjects: {
    program: r.one.programs({
      from: r.curriculumSubjects.programId,
      to: r.programs.id,
      optional: false,
    }),
    subject: r.one.subjects({
      from: r.curriculumSubjects.subjectId,
      to: r.subjects.id,
      optional: false,
    }),
  },

  classSections: {
    program: r.one.programs({
      from: r.classSections.programId,
      to: r.programs.id,
      optional: false,
    }),
    term: r.one.terms({
      from: r.classSections.termId,
      to: r.terms.id,
      optional: false,
    }),
    adviser: r.one.instructors({
      from: r.classSections.adviserId,
      to: r.instructors.id,
      optional: true,
    }),
    students: r.many.sectionStudents({
      from: r.classSections.id,
      to: r.sectionStudents.classSectionId,
    }),
    classes: r.many.classes({
      from: r.classSections.id,
      to: r.classes.classSectionId,
    }),
  },

  sectionStudents: {
    classSection: r.one.classSections({
      from: r.sectionStudents.classSectionId,
      to: r.classSections.id,
      optional: false,
    }),
    student: r.one.students({
      from: r.sectionStudents.studentId,
      to: r.students.id,
      optional: false,
    }),
  },

  classes: {
    subject: r.one.subjects({
      from: r.classes.subjectId,
      to: r.subjects.id,
      optional: false,
    }),
    classSection: r.one.classSections({
      from: r.classes.classSectionId,
      to: r.classSections.id,
      optional: false,
    }),
    instructor: r.one.instructors({
      from: r.classes.instructorId,
      to: r.instructors.id,
      optional: false,
    }),
    term: r.one.terms({
      from: r.classes.termId,
      to: r.terms.id,
      optional: false,
    }),
    schedules: r.many.classSchedules({
      from: r.classes.id,
      to: r.classSchedules.classId,
    }),
    enrollments: r.many.classEnrollments({
      from: r.classes.id,
      to: r.classEnrollments.classId,
    }),
    sessions: r.many.classSessions({
      from: r.classes.id,
      to: r.classSessions.classId,
    }),
  },

  classSchedules: {
    class: r.one.classes({
      from: r.classSchedules.classId,
      to: r.classes.id,
      optional: false,
    }),
    room: r.one.rooms({
      from: r.classSchedules.roomId,
      to: r.rooms.id,
      optional: false,
    }),
    sessions: r.many.classSessions({
      from: r.classSchedules.id,
      to: r.classSessions.classScheduleId,
    }),
  },

  classEnrollments: {
    class: r.one.classes({
      from: r.classEnrollments.classId,
      to: r.classes.id,
      optional: false,
    }),
    student: r.one.students({
      from: r.classEnrollments.studentId,
      to: r.students.id,
      optional: false,
    }),
  },

  classSessions: {
    class: r.one.classes({
      from: r.classSessions.classId,
      to: r.classes.id,
      optional: false,
    }),
    classSchedule: r.one.classSchedules({
      from: r.classSessions.classScheduleId,
      to: r.classSchedules.id,
      optional: false,
    }),
    room: r.one.rooms({
      from: r.classSessions.roomId,
      to: r.rooms.id,
      optional: false,
    }),
    calendarDate: r.one.calendarDates({
      from: r.classSessions.sessionDate,
      to: r.calendarDates.dateValue,
      optional: false,
    }),
    logs: r.many.attendanceLogs({
      from: r.classSessions.id,
      to: r.attendanceLogs.sessionId,
    }),
  },

  attendanceLogs: {
    session: r.one.classSessions({
      from: r.attendanceLogs.sessionId,
      to: r.classSessions.id,
      optional: false,
    }),
    student: r.one.students({
      from: r.attendanceLogs.studentId,
      to: r.students.id,
      optional: false,
    }),
  },
}));
