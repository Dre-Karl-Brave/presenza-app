import { formatMonth, formatNumber, formatWeek } from "./format";
import type { Granularity, RouterOutputs } from "./types";

type Outputs = RouterOutputs["analytics"];

export type ChartPoint = {
  label: string;
  value: number | null; // percent, 0 to 100
  detail?: string;
};

// Rates arrive as fractions (0..1); charts plot percentages.
function percent(rate: number | null): number | null {
  return rate === null ? null : Math.round(rate * 1000) / 10;
}

export function trendPoints(rows: Outputs["trend"], granularity: Granularity): ChartPoint[] {
  return rows.map((row) => ({
    label:
      granularity === "month"
        ? formatMonth(row.bucket)
        : granularity === "week"
          ? formatWeek(row.bucket)
          : row.bucket,
    value: percent(row.stats.attendanceRate),
    detail: `${formatNumber(row.stats.counted)} records counted`,
  }));
}

export function absencePointsByDay(rows: Outputs["absencesByDayOfWeek"]): ChartPoint[] {
  return rows.map((row) => ({
    label: row.name,
    value: percent(row.stats.absenceRate),
    detail: `${formatNumber(row.stats.absent)} absences`,
  }));
}

export function latePointsByHour(rows: Outputs["lateByHour"]): ChartPoint[] {
  return rows.map((row) => ({
    label: row.label,
    value: percent(row.stats.lateRate),
    detail: `${formatNumber(row.stats.late)} late arrivals`,
  }));
}

export function subjectPoints(rows: Outputs["bySubject"]): ChartPoint[] {
  return rows.map((row) => ({
    label: row.code,
    value: percent(row.stats.attendanceRate),
    detail: row.title,
  }));
}

export function sectionPoints(rows: Outputs["bySection"]): ChartPoint[] {
  return rows.map((row) => ({
    label: row.name,
    value: percent(row.stats.attendanceRate),
    detail: `${formatNumber(row.stats.counted)} records counted`,
  }));
}

export type SharePoint = {
  key: "present" | "late" | "absent" | "excused";
  label: string;
  value: number; // percent of all records
  count: number;
};

export function sharePoints(data: Outputs["statusBreakdown"]): SharePoint[] {
  const keys: SharePoint["key"][] = ["present", "late", "absent", "excused"];
  return keys.map((key) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    value: Math.round(data.shares[key] * 1000) / 10,
    count: data.stats[key],
  }));
}
