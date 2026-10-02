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

// ── Multi-rate trend (attendance + late + absence on one chart) ──────────────

export type MultiTrendPoint = {
  label: string;
  attendance: number | null;
  late: number | null;
  absence: number | null;
  detail: string;
};

export function multiTrendPoints(
  rows: Outputs["trend"],
  granularity: Granularity,
): MultiTrendPoint[] {
  return rows.map((row) => ({
    label:
      granularity === "month"
        ? formatMonth(row.bucket)
        : granularity === "week"
          ? formatWeek(row.bucket)
          : row.bucket,
    attendance: percent(row.stats.attendanceRate),
    late: percent(row.stats.lateRate),
    absence: percent(row.stats.absenceRate),
    detail: `${formatNumber(row.stats.counted)} records`,
  }));
}

// ── Volume trend (record counts per bucket) ───────────────────────────────────

export type VolumeTrendPoint = {
  label: string;
  total: number;
  counted: number;
};

export function volumeTrendPoints(
  rows: Outputs["trend"],
  granularity: Granularity,
): VolumeTrendPoint[] {
  return rows.map((row) => ({
    label:
      granularity === "month"
        ? formatMonth(row.bucket)
        : granularity === "week"
          ? formatWeek(row.bucket)
          : row.bucket,
    total: row.stats.total,
    counted: row.stats.counted,
  }));
}

// ── Stacked status composition (% breakdown per section / subject) ────────────

export type StackedStatusPoint = {
  label: string;
  present: number;
  late: number;
  absent: number;
  excused: number;
};

function stackedFromStats(
  total: number,
  stats: { present: number; late: number; absent: number; excused: number },
): Pick<StackedStatusPoint, "present" | "late" | "absent" | "excused"> {
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0);
  return {
    present: pct(stats.present),
    late: pct(stats.late),
    absent: pct(stats.absent),
    excused: pct(stats.excused),
  };
}

export function sectionStackedPoints(rows: Outputs["bySection"]): StackedStatusPoint[] {
  return rows.map((row) => ({
    label: row.name,
    ...stackedFromStats(row.stats.total, row.stats),
  }));
}

export function subjectStackedPoints(rows: Outputs["bySubject"]): StackedStatusPoint[] {
  return rows.map((row) => ({
    label: row.code,
    ...stackedFromStats(row.stats.total, row.stats),
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
