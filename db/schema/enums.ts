import { pgEnum } from "drizzle-orm/pg-core";

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
