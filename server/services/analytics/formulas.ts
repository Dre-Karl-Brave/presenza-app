import type { StatusCounts, Stats } from "./types";

// Students strictly below this attendance rate count as low attendance.
export const LOW_ATTENDANCE_THRESHOLD = 0.8;

export function emptyCounts(): StatusCounts {
  return { present: 0, late: 0, absent: 0, excused: 0 };
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

// THE formula. Every rate in the system comes from this function.
//   counted        = total records - excused
//   attendanceRate = (present + late) / counted
//   lateRate       = late / counted
//   absenceRate    = absent / counted
// A rate is null when counted is 0.
export function toStats(counts: StatusCounts): Stats {
  const total = counts.present + counts.late + counts.absent + counts.excused;
  const counted = total - counts.excused;
  return {
    ...counts,
    total,
    counted,
    attendanceRate: ratio(counts.present + counts.late, counted),
    lateRate: ratio(counts.late, counted),
    absenceRate: ratio(counts.absent, counted),
  };
}

export function isLowAttendance(stats: Stats): boolean {
  return stats.attendanceRate !== null && stats.attendanceRate < LOW_ATTENDANCE_THRESHOLD;
}

// Share of each status over ALL records (excused included), summing to 1.
export function statusShares(stats: Stats): StatusCounts {
  const share = (n: number) => (stats.total === 0 ? 0 : n / stats.total);
  return {
    present: share(stats.present),
    late: share(stats.late),
    absent: share(stats.absent),
    excused: share(stats.excused),
  };
}
