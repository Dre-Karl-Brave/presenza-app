import {
  pgTable,
  pgEnum,
  serial,
  bigserial,
  integer,
  smallint,
  varchar,
  boolean,
  date,
  time,
  timestamp,
  unique,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

// =====================================================================
// ENUMS
// =====================================================================

export const termTypeEnum = pgEnum("term_type", [
  "first_semester",
  "second_semester",
  "summer",
]);

export const gradingPeriodEnum = pgEnum("grading_period", [
  "preliminary",
  "midterm",
  "pre_final",
  "final",
]);

export const eventTypeEnum = pgEnum("event_type", [
  "regular_holiday",
  "special_holiday",
  "class_suspension",
  "exam_day",
  "school_event",
]);

export const roomTypeEnum = pgEnum("room_type", [
  "lecture",
  "computer_laboratory",
  "science_laboratory",
  "gymnasium",
  "other",
]);

export const employmentTypeEnum = pgEnum("employment_type", [
  "full_time",
  "part_time",
]);

export const sexEnum = pgEnum("sex", ["male", "female"]);

export const studentTypeEnum = pgEnum("student_type", [
  "regular",
  "irregular",
  "transferee",
]);

export const residenceTypeEnum = pgEnum("residence_type", [
  "commuter",
  "dormer",
  "local",
]);

export const studentStatusEnum = pgEnum("student_status", [
  "active",
  "dropped",
  "leave_of_absence",
  "graduated",
]);

export const subjectTypeEnum = pgEnum("subject_type", [
  "major",
  "minor",
  "general_education",
  "physical_education",
  "national_service_training_program",
]);

export const shiftEnum = pgEnum("shift", ["day", "evening"]);

export const meetingTypeEnum = pgEnum("meeting_type", [
  "lecture",
  "laboratory",
]);

export const dropReasonEnum = pgEnum("drop_reason", [
  "voluntary",
  "excessive_absences",
  "transferred",
  "other",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "held",
  "cancelled",
  "makeup",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "late",
  "absent",
  "excused",
]);

export const logMethodEnum = pgEnum("log_method", [
  "rfid_card",
  "qr_code",
  "manual",
  "biometric",
]);

export const excuseReasonEnum = pgEnum("excuse_reason", [
  "medical",
  "family",
  "school_activity",
  "weather",
  "other",
]);

// =====================================================================
// 1. ACADEMIC CALENDAR
// =====================================================================

export const academicYears = pgTable("academic_years", {
  id: serial("academic_year_id").primaryKey(),
  label: varchar("label", { length: 20 }).notNull().unique(), // "2026-2027"
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
});

export const terms = pgTable(
  "terms",
  {
    id: serial("term_id").primaryKey(),
    academicYearId: integer("academic_year_id")
      .notNull()
      .references(() => academicYears.id),
    termType: termTypeEnum("term_type").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    midtermStart: date("midterm_start"),
    finalsStart: date("finals_start"),
  },
  (table) => [unique().on(table.academicYearId, table.termType)],
);

// Date dimension: one row per calendar day
export const calendarDates = pgTable(
  "calendar_dates",
  {
    dateValue: date("date_value").primaryKey(),
    termId: integer("term_id").references(() => terms.id),
    dayOfWeek: smallint("day_of_week").notNull(), // 1 = Monday ... 7 = Sunday
    dayName: varchar("day_name", { length: 10 }).notNull(),
    dayOfMonth: smallint("day_of_month").notNull(),
    isoWeek: smallint("iso_week").notNull(),
    weekOfTerm: smallint("week_of_term"),
    monthNum: smallint("month_num").notNull(),
    monthName: varchar("month_name", { length: 10 }).notNull(),
    quarter: smallint("quarter").notNull(),
    year: smallint("year").notNull(),
    isWeekend: boolean("is_weekend").notNull(),
    isClassDay: boolean("is_class_day").notNull().default(true),
    period: gradingPeriodEnum("period"),
  },
  (table) => [
    index("calendar_dates_term_id_idx").on(table.termId),
    index("calendar_dates_iso_week_idx").on(table.isoWeek),
    index("calendar_dates_month_num_idx").on(table.monthNum),
  ],
);

export const calendarEvents = pgTable("calendar_events", {
  id: serial("event_id").primaryKey(),
  eventDate: date("event_date")
    .notNull()
    .references(() => calendarDates.dateValue),
  eventType: eventTypeEnum("event_type").notNull(),
  name: varchar("name", { length: 150 }).notNull(), // "Typhoon Signal No. 2"
  classesCancelled: boolean("classes_cancelled").notNull().default(true),
});

// =====================================================================
// 2. ORGANIZATION & FACILITIES
// =====================================================================

export const departments = pgTable("departments", {
  id: serial("department_id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(), // "CCS"
  name: varchar("name", { length: 100 }).notNull(),
});

export const programs = pgTable("programs", {
  id: serial("program_id").primaryKey(),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departments.id),
  code: varchar("code", { length: 15 }).notNull().unique(), // "BSIT"
  name: varchar("name", { length: 150 }).notNull(),
  yearsToComplete: smallint("years_to_complete").notNull().default(4),
});

export const buildings = pgTable("buildings", {
  id: serial("building_id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
});

export const rooms = pgTable("rooms", {
  id: serial("room_id").primaryKey(),
  buildingId: integer("building_id")
    .notNull()
    .references(() => buildings.id),
  roomCode: varchar("room_code", { length: 20 }).notNull().unique(), // "MB-301"
  roomType: roomTypeEnum("room_type").notNull(),
  floor: smallint("floor"),
  capacity: smallint("capacity").notNull(),
});

// =====================================================================
// 3. PEOPLE
// =====================================================================

export const instructors = pgTable("instructors", {
  id: serial("instructor_id").primaryKey(),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departments.id),
  employeeNo: varchar("employee_no", { length: 20 }).notNull().unique(),
  firstName: varchar("first_name", { length: 50 }).notNull(),
  lastName: varchar("last_name", { length: 50 }).notNull(),
  employmentType: employmentTypeEnum("employment_type").notNull(),
});

export const students = pgTable(
  "students",
  {
    id: serial("student_id").primaryKey(),
    programId: integer("program_id")
      .notNull()
      .references(() => programs.id),
    studentNo: varchar("student_no", { length: 20 }).notNull().unique(), // "2026-00123"
    firstName: varchar("first_name", { length: 50 }).notNull(),
    lastName: varchar("last_name", { length: 50 }).notNull(),
    sex: sexEnum("sex"),
    yearLevel: smallint("year_level").notNull(),
    studentType: studentTypeEnum("student_type").notNull().default("regular"),
    residenceType: residenceTypeEnum("residence_type"),
    status: studentStatusEnum("status").notNull().default("active"),
  },
  (table) => [index("students_program_id_idx").on(table.programId)],
);

// =====================================================================
// 4. SUBJECTS, SECTIONS, CLASSES
// =====================================================================

// Subject = catalog item ("IT301 - Data Structures")
export const subjects = pgTable("subjects", {
  id: serial("subject_id").primaryKey(),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departments.id),
  code: varchar("code", { length: 15 }).notNull().unique(),
  title: varchar("title", { length: 150 }).notNull(),
  subjectType: subjectTypeEnum("subject_type").notNull(),
  lectureUnits: smallint("lecture_units").notNull().default(3),
  labUnits: smallint("lab_units").notNull().default(0),
});

// Which subjects a program takes, per year level and term
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

// Class section = block of students ("BSIT 3-A", 1st sem 2026)
export const classSections = pgTable(
  "class_sections",
  {
    id: serial("class_section_id").primaryKey(),
    programId: integer("program_id")
      .notNull()
      .references(() => programs.id),
    termId: integer("term_id")
      .notNull()
      .references(() => terms.id),
    yearLevel: smallint("year_level").notNull(),
    sectionLetter: varchar("section_letter", { length: 5 }).notNull(),
    sectionName: varchar("section_name", { length: 30 }).notNull(),
    shift: shiftEnum("shift").notNull().default("day"),
    adviserId: integer("adviser_id").references(() => instructors.id),
  },
  (table) => [
    unique().on(
      table.programId,
      table.termId,
      table.yearLevel,
      table.sectionLetter,
    ),
  ],
);

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

// Class = subject + section + instructor + term
export const classes = pgTable(
  "classes",
  {
    id: serial("class_id").primaryKey(),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id),
    classSectionId: integer("class_section_id")
      .notNull()
      .references(() => classSections.id),
    instructorId: integer("instructor_id")
      .notNull()
      .references(() => instructors.id),
    termId: integer("term_id")
      .notNull()
      .references(() => terms.id),
    classCode: varchar("class_code", { length: 20 }).notNull().unique(), // "IT301-3A-26S1"
    graceMinutes: smallint("grace_minutes").notNull().default(15),
    maxAbsences: smallint("max_absences").notNull().default(7),
  },
  (table) => [
    unique().on(table.subjectId, table.classSectionId, table.termId),
  ],
);

// Weekly meeting pattern (lecture Monday/Wednesday + laboratory Friday, etc.)
export const classSchedules = pgTable("class_schedules", {
  id: serial("class_schedule_id").primaryKey(),
  classId: integer("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  roomId: integer("room_id")
    .notNull()
    .references(() => rooms.id),
  meetingType: meetingTypeEnum("meeting_type").notNull(),
  dayOfWeek: smallint("day_of_week").notNull(), // 1 = Monday ... 7 = Sunday
  startTime: time("start_time", { precision: 0 }).notNull(),
  endTime: time("end_time", { precision: 0 }).notNull(),
});

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

// =====================================================================
// 5. SESSIONS & ATTENDANCE LOGS
// =====================================================================

// One row per actual class meeting
export const classSessions = pgTable(
  "class_sessions",
  {
    id: serial("session_id").primaryKey(),
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    classScheduleId: integer("class_schedule_id")
      .notNull()
      .references(() => classSchedules.id),
    roomId: integer("room_id")
      .notNull()
      .references(() => rooms.id),
    sessionDate: date("session_date")
      .notNull()
      .references(() => calendarDates.dateValue),
    scheduledStart: timestamp("scheduled_start", { precision: 0 }).notNull(),
    scheduledEnd: timestamp("scheduled_end", { precision: 0 }).notNull(),
    sessionStatus: sessionStatusEnum("session_status").notNull().default("held"),

    // Time grains for filtering - fill these in the seeder
    startHour: smallint("start_hour").notNull(), // 0-23
    weekStart: date("week_start").notNull(), // Monday of that week
    monthStart: date("month_start").notNull(), // 1st of that month
  },
  (table) => [
    unique().on(table.classId, table.scheduledStart),
    index("class_sessions_session_date_idx").on(table.sessionDate),
    index("class_sessions_week_start_idx").on(table.weekStart),
    index("class_sessions_month_start_idx").on(table.monthStart),
    index("class_sessions_start_hour_idx").on(table.startHour),
    index("class_sessions_class_id_idx").on(table.classId),
  ],
);

// Core fact table: one row per student per session
export const attendanceLogs = pgTable(
  "attendance_logs",
  {
    id: bigserial("log_id", { mode: "number" }).primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => classSessions.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id),
    status: attendanceStatusEnum("status").notNull(),
    timeIn: timestamp("time_in", { precision: 0 }), // NULL if absent
    timeOut: timestamp("time_out", { precision: 0 }),
    logMethod: logMethodEnum("log_method"),
    leftEarly: boolean("left_early").notNull().default(false),
    excuseReason: excuseReasonEnum("excuse_reason"),
    minutesLate: smallint("minutes_late").notNull().default(0),

    // Derived - fill these in the seeder
    minutesInClass: integer("minutes_in_class"), // timeOut - timeIn
    timeInHour: smallint("time_in_hour"), // hour of timeIn
    timeOutHour: smallint("time_out_hour"), // hour of timeOut
  },
  (table) => [
    unique().on(table.sessionId, table.studentId),
    index("attendance_logs_student_id_idx").on(table.studentId),
    index("attendance_logs_status_idx").on(table.status),
    index("attendance_logs_time_in_hour_idx").on(table.timeInHour),
  ],
);
