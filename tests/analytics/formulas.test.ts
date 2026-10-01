import { describe, expect, it } from "vitest";
import {
  isLowAttendance,
  LOW_ATTENDANCE_THRESHOLD,
  statusShares,
  toStats,
} from "@/server/services/analytics/formulas";

describe("toStats", () => {
  it("excludes excused from the denominator and counts late as attending", () => {
    const stats = toStats({ present: 4, late: 2, absent: 4, excused: 1 });
    expect(stats.total).toBe(11);
    expect(stats.counted).toBe(10);
    expect(stats.attendanceRate).toBeCloseTo(0.6);
    expect(stats.lateRate).toBeCloseTo(0.2);
    expect(stats.absenceRate).toBeCloseTo(0.4);
  });

  it("returns null rates when nothing is counted", () => {
    const empty = toStats({ present: 0, late: 0, absent: 0, excused: 0 });
    expect(empty.attendanceRate).toBeNull();
    expect(empty.lateRate).toBeNull();
    expect(empty.absenceRate).toBeNull();

    const onlyExcused = toStats({ present: 0, late: 0, absent: 0, excused: 3 });
    expect(onlyExcused.total).toBe(3);
    expect(onlyExcused.counted).toBe(0);
    expect(onlyExcused.attendanceRate).toBeNull();
  });

  it("attendance rate and absence rate add up to 1", () => {
    const stats = toStats({ present: 7, late: 3, absent: 5, excused: 2 });
    expect((stats.attendanceRate ?? 0) + (stats.absenceRate ?? 0)).toBeCloseTo(1);
  });
});

describe("isLowAttendance", () => {
  it("is true strictly below 80 percent", () => {
    expect(LOW_ATTENDANCE_THRESHOLD).toBe(0.8);
    expect(isLowAttendance(toStats({ present: 79, late: 0, absent: 21, excused: 0 }))).toBe(true);
  });

  it("is false at exactly 80 percent and above", () => {
    expect(isLowAttendance(toStats({ present: 4, late: 0, absent: 1, excused: 0 }))).toBe(false);
    expect(isLowAttendance(toStats({ present: 5, late: 0, absent: 0, excused: 0 }))).toBe(false);
  });

  it("is false when the rate is undefined", () => {
    expect(isLowAttendance(toStats({ present: 0, late: 0, absent: 0, excused: 2 }))).toBe(false);
  });
});

describe("statusShares", () => {
  it("shares are over all records and sum to 1", () => {
    const shares = statusShares(toStats({ present: 4, late: 2, absent: 4, excused: 2 }));
    expect(shares.excused).toBeCloseTo(2 / 12);
    expect(shares.present + shares.late + shares.absent + shares.excused).toBeCloseTo(1);
  });

  it("is all zero when empty", () => {
    expect(statusShares(toStats({ present: 0, late: 0, absent: 0, excused: 0 }))).toEqual({
      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
    });
  });
});
