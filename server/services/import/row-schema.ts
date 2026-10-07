import { z } from "zod";
import { isRealDate, parseTime } from "./dates";
import { splitName } from "./names";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const requiredText = (max: number) =>
  z.string().trim().min(1, "is required").max(max, `must be at most ${max} characters`);

const timeText = z.string().trim().refine((value) => parseTime(value) !== null, "must be a time like 08:30");
const optionalTime = z.preprocess(emptyToUndefined, timeText.optional());

const STATUSES = ["present", "late", "absent", "excused"] as const;

// Every cell has already been turned into text (see validate.ts). This schema
// is the single place that says what a valid row looks like.
export const rowSchema = z
  .object({
    studentNo: requiredText(20),
    studentName: requiredText(101).refine(
      (value) => splitName(value) !== null,
      "must include a first and a last name",
    ),
    subjectCode: requiredText(15),
    section: requiredText(30),
    date: z.string().trim().min(1, "is required").refine(isRealDate, "must be a valid date (e.g. 2024-01-15, 01/15/2024, 15/01/2024, or 15 Jan 2024)"),
    timeIn: optionalTime,
    timeOut: optionalTime,
    status: z.preprocess(
      (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
      z.enum(STATUSES, { error: "must be present, late, absent, or excused" }),
    ),
    classStart: optionalTime,
    classEnd: optionalTime,
    minutesLate: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .regex(/^\d+$/, "must be a whole number")
        .refine((value) => Number(value) <= 600, "must be 600 or less")
        .optional(),
    ),
  })
  .superRefine((row, ctx) => {
    const attended = row.status === "present" || row.status === "late";
    if (attended && row.timeIn === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["timeIn"],
        message: "is required when the status is present or late",
      });
    }
    if (attended && row.timeIn !== undefined && row.timeOut !== undefined) {
      const timeIn = parseTime(row.timeIn);
      const timeOut = parseTime(row.timeOut);
      if (timeIn !== null && timeOut !== null && timeOut < timeIn) {
        ctx.addIssue({ code: "custom", path: ["timeOut"], message: "must not be before time in" });
      }
    }
    if (row.classStart !== undefined && row.classEnd === undefined) {
      ctx.addIssue({ code: "custom", path: ["classEnd"], message: "is required when class start is given" });
    }
    if (row.classEnd !== undefined && row.classStart === undefined) {
      ctx.addIssue({ code: "custom", path: ["classStart"], message: "is required when class end is given" });
    }
    if (row.classStart !== undefined && row.classEnd !== undefined) {
      const start = parseTime(row.classStart);
      const end = parseTime(row.classEnd);
      if (start !== null && end !== null && end <= start) {
        ctx.addIssue({ code: "custom", path: ["classEnd"], message: "must be after class start" });
      }
    }
  });

export type RowText = z.input<typeof rowSchema>;
