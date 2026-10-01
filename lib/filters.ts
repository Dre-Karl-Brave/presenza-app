"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AnalyticsFilter } from "@/server/services/analytics/schemas";

// Filter state lives in the URL, so every page shares it and links stay shareable.
const PARAM = {
  dayOfWeek: "day",
  hour: "hour",
  week: "week",
  month: "month",
  subjectId: "subject",
  sectionId: "section",
} as const;

export type FilterKey = keyof typeof PARAM;

function readInt(value: string | null): number | undefined {
  if (value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

export function parseFilter(params: URLSearchParams): AnalyticsFilter {
  const filter: AnalyticsFilter = {};
  const day = readInt(params.get(PARAM.dayOfWeek));
  if (day !== undefined && day >= 1 && day <= 7) filter.dayOfWeek = day;
  const hour = readInt(params.get(PARAM.hour));
  if (hour !== undefined && hour >= 0 && hour <= 23) filter.hour = hour;
  const subject = readInt(params.get(PARAM.subjectId));
  if (subject !== undefined && subject > 0) filter.subjectId = subject;
  const section = readInt(params.get(PARAM.sectionId));
  if (section !== undefined && section > 0) filter.sectionId = section;
  const week = params.get(PARAM.week);
  if (week && /^\d{4}-\d{2}-\d{2}$/.test(week)) filter.week = week;
  const month = params.get(PARAM.month);
  if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) filter.month = month;
  return filter;
}

export function useFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  const filter = useMemo(() => parseFilter(new URLSearchParams(queryString)), [queryString]);

  const setFilter = useCallback(
    (key: FilterKey, value: string) => {
      const next = new URLSearchParams(queryString);
      if (value === "") next.delete(PARAM[key]);
      else next.set(PARAM[key], value);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [queryString, pathname, router],
  );

  const reset = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const hasFilters = Object.keys(filter).length > 0;

  return { filter, setFilter, reset, hasFilters, queryString };
}

export function filterValue(filter: AnalyticsFilter, key: FilterKey): string {
  const value = filter[key];
  if (value === undefined) return "";
  return String(value);
}
