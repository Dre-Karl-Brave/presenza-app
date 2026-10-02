import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const isoMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected YYYY-MM");

export const analyticsFilterSchema = z.object({
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
  dayOfWeek: z.number().int().min(1).max(7).optional(),
  hour: z.number().int().min(0).max(23).optional(),
  week: isoDate.optional(),
  month: isoMonth.optional(),
  subjectId: z.number().int().positive().optional(),
  sectionId: z.number().int().positive().optional(),
});

export type AnalyticsFilter = z.infer<typeof analyticsFilterSchema>;

export const filterInputSchema = z
  .object({ filter: analyticsFilterSchema.default({}) })
  .default({ filter: {} });

export const trendInputSchema = z.object({
  filter: analyticsFilterSchema.default({}),
  granularity: z.enum(["day", "week", "month"]),
});

export const studentReportInputSchema = z
  .object({
  filter: analyticsFilterSchema.default({}),
  search: z.string().trim().max(100).optional(),
  sortBy: z.enum(["name", "studentNo", "attendanceRate", "absent"]).default("name"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(10000).default(25),
})
  .default({ filter: {}, sortBy: "name", sortDir: "asc", page: 1, pageSize: 25 });

export type StudentReportInput = z.infer<typeof studentReportInputSchema>;
