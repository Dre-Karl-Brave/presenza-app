"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTRPC } from "./trpc";
import { useFilters } from "./filters";
import type { Granularity } from "./types";

// One hook per analytics procedure, already wired to the shared filter bar.

export function useFilterOptions() {
  const trpc = useTRPC();
  return useQuery(trpc.analytics.filterOptions.queryOptions());
}

export function useSummary() {
  const trpc = useTRPC();
  const { filter } = useFilters();
  return useQuery({
    ...trpc.analytics.summary.queryOptions({ filter }),
    placeholderData: keepPreviousData,
  });
}

export function useStatusBreakdown() {
  const trpc = useTRPC();
  const { filter } = useFilters();
  return useQuery({
    ...trpc.analytics.statusBreakdown.queryOptions({ filter }),
    placeholderData: keepPreviousData,
  });
}

export function useTrend(granularity: Granularity) {
  const trpc = useTRPC();
  const { filter } = useFilters();
  return useQuery({
    ...trpc.analytics.trend.queryOptions({ filter, granularity }),
    placeholderData: keepPreviousData,
  });
}

export function useAbsencesByDayOfWeek() {
  const trpc = useTRPC();
  const { filter } = useFilters();
  return useQuery({
    ...trpc.analytics.absencesByDayOfWeek.queryOptions({ filter }),
    placeholderData: keepPreviousData,
  });
}

export function useLateByHour() {
  const trpc = useTRPC();
  const { filter } = useFilters();
  return useQuery({
    ...trpc.analytics.lateByHour.queryOptions({ filter }),
    placeholderData: keepPreviousData,
  });
}

export function useBySubject() {
  const trpc = useTRPC();
  const { filter } = useFilters();
  return useQuery({
    ...trpc.analytics.bySubject.queryOptions({ filter }),
    placeholderData: keepPreviousData,
  });
}

export function useBySection() {
  const trpc = useTRPC();
  const { filter } = useFilters();
  return useQuery({
    ...trpc.analytics.bySection.queryOptions({ filter }),
    placeholderData: keepPreviousData,
  });
}

export function useLowAttendance() {
  const trpc = useTRPC();
  const { filter } = useFilters();
  return useQuery({
    ...trpc.analytics.lowAttendance.queryOptions({ filter }),
    placeholderData: keepPreviousData,
  });
}

export type StudentReportParams = {
  search: string;
  sortBy: "name" | "studentNo" | "attendanceRate" | "absent";
  sortDir: "asc" | "desc";
  page: number;
  pageSize: number;
};

export function useStudentReport(params: StudentReportParams) {
  const trpc = useTRPC();
  const { filter } = useFilters();
  return useQuery({
    ...trpc.analytics.studentReport.queryOptions({
      filter,
      search: params.search || undefined,
      sortBy: params.sortBy,
      sortDir: params.sortDir,
      page: params.page,
      pageSize: params.pageSize,
    }),
    placeholderData: keepPreviousData,
  });
}
