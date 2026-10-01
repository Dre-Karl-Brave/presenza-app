import { publicProcedure, router } from "@/server/trpc";
import {
  getAbsencesByDayOfWeek,
  getBySection,
  getBySubject,
  getFilterOptions,
  getLateByHour,
  getLowAttendance,
  getStatusBreakdown,
  getStudentReport,
  getSummary,
  getTrend,
} from "@/server/services/analytics";
import {
  filterInputSchema,
  studentReportInputSchema,
  trendInputSchema,
} from "@/server/services/analytics/schemas";

// Routers stay thin: validate, call the analytics service, return.
const filterInput = filterInputSchema;

export const analyticsRouter = router({
  filterOptions: publicProcedure.query(({ ctx }) => getFilterOptions(ctx.db)),

  summary: publicProcedure
    .input(filterInput)
    .query(({ ctx, input }) => getSummary(ctx.db, input.filter)),

  trend: publicProcedure
    .input(trendInputSchema)
    .query(({ ctx, input }) => getTrend(ctx.db, input.filter, input.granularity)),

  absencesByDayOfWeek: publicProcedure
    .input(filterInput)
    .query(({ ctx, input }) => getAbsencesByDayOfWeek(ctx.db, input.filter)),

  lateByHour: publicProcedure
    .input(filterInput)
    .query(({ ctx, input }) => getLateByHour(ctx.db, input.filter)),

  bySubject: publicProcedure
    .input(filterInput)
    .query(({ ctx, input }) => getBySubject(ctx.db, input.filter)),

  bySection: publicProcedure
    .input(filterInput)
    .query(({ ctx, input }) => getBySection(ctx.db, input.filter)),

  statusBreakdown: publicProcedure
    .input(filterInput)
    .query(({ ctx, input }) => getStatusBreakdown(ctx.db, input.filter)),

  studentReport: publicProcedure
    .input(studentReportInputSchema)
    .query(({ ctx, input }) => getStudentReport(ctx.db, input)),

  lowAttendance: publicProcedure
    .input(filterInput)
    .query(({ ctx, input }) => getLowAttendance(ctx.db, input.filter)),
});
