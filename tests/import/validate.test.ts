import { describe, expect, it } from "vitest";
import { parseFile } from "@/server/services/import/parse";
import { validateTable } from "@/server/services/import/validate";
import { splitName } from "@/server/services/import/names";
import {
  isoDayOfWeek,
  isoWeekNumber,
  isRealDate,
  monthStart,
  parseTime,
  termSlotFor,
  weekStart,
} from "@/server/services/import/dates";
import { mapHeaders } from "@/server/services/import/columns";
import { ImportFileError } from "@/server/services/import/types";
import { fixtureBytes } from "./helpers";

describe("splitName", () => {
  it("reads 'Last, First' and 'First Last'", () => {
    expect(splitName("Reyes, Ana Marie")).toEqual({ firstName: "Ana Marie", lastName: "Reyes" });
    expect(splitName("Ana Marie Reyes")).toEqual({ firstName: "Ana Marie", lastName: "Reyes" });
    expect(splitName("  Ben   Cruz ")).toEqual({ firstName: "Ben", lastName: "Cruz" });
  });

  it("uses a single word for both parts and rejects blanks", () => {
    expect(splitName("Madonna")).toEqual({ firstName: "Madonna", lastName: "Madonna" });
    expect(splitName("   ")).toBeNull();
    expect(splitName("Reyes,")).toBeNull();
  });
});

describe("dates", () => {
  it("finds weekday, week start and month start", () => {
    expect(isoDayOfWeek("2026-08-03")).toBe(1); // Monday
    expect(isoDayOfWeek("2026-08-09")).toBe(7); // Sunday
    expect(weekStart("2026-08-05")).toBe("2026-08-03");
    expect(weekStart("2026-08-09")).toBe("2026-08-03");
    expect(monthStart("2026-08-17")).toBe("2026-08-01");
    expect(isoWeekNumber("2026-01-01")).toBe(1);
    expect(isoWeekNumber("2026-08-17")).toBe(34);
  });

  it("validates real dates and times", () => {
    expect(isRealDate("2026-02-29")).toBe(false);
    expect(isRealDate("2028-02-29")).toBe(true);
    expect(parseTime("08:30")).toBe(510);
    expect(parseTime("8:05:00")).toBe(485);
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("noon")).toBeNull();
  });

  it("maps a date to its term slot", () => {
    expect(termSlotFor("2026-09-15")).toMatchObject({ academicYearLabel: "2026-2027", termType: "first_semester" });
    expect(termSlotFor("2027-02-10")).toMatchObject({ academicYearLabel: "2026-2027", termType: "second_semester" });
    expect(termSlotFor("2027-06-20")).toMatchObject({ academicYearLabel: "2026-2027", termType: "summer" });
  });
});

describe("headers", () => {
  it("accepts spelling variants and reports missing required columns", () => {
    const { indexByKey, missing } = mapHeaders(["Student No.", "NAME", "subject", "Section", "Date", "In", "Out", "Attendance"]);
    expect(missing).toEqual([]);
    expect(indexByKey.get("studentNo")).toBe(0);
    expect(indexByKey.get("status")).toBe(7);

    expect(mapHeaders(["student number", "date"]).missing).toEqual([
      "student name",
      "subject code",
      "section",
      "time in",
      "time out",
      "status",
    ]);
  });
});

describe("validateTable on CSV", () => {
  it("reads a clean file", async () => {
    const result = validateTable(await parseFile("attendance.csv", fixtureBytes("attendance.csv")));
    expect(result.errors).toEqual([]);
    expect(result.rowsRead).toBe(6);
    expect(result.rows).toHaveLength(6);
    expect(result.rows[0]).toMatchObject({
      rowNumber: 2,
      studentNo: "S001",
      firstName: "Ana",
      lastName: "Reyes",
      subjectCode: "MATH",
      sectionName: "TP 1-A",
      date: "2026-08-03",
      timeIn: 7 * 60 + 58,
      timeOut: 9 * 60,
      status: "present",
      classStart: 8 * 60,
      classEnd: 9 * 60,
    });
    // Absent rows carry no times.
    expect(result.rows[2]).toMatchObject({ status: "absent", timeIn: null, timeOut: null });
    expect(result.sample).toHaveLength(6);
  });

  it("accepts the 8-column file with header variants and any status case", async () => {
    const result = validateTable(await parseFile("no-times.csv", fixtureBytes("no-times.csv")));
    expect(result.errors).toEqual([]);
    expect(result.rows.map((r) => r.status)).toEqual(["present", "late"]);
    expect(result.rows[0].classStart).toBeNull();
  });

  it("reports every problem by spreadsheet row and column", async () => {
    const result = validateTable(await parseFile("invalid.csv", fixtureBytes("invalid.csv")));
    expect(result.rowsRead).toBe(9); // the blank line is ignored
    expect(result.rows.map((r) => r.rowNumber)).toEqual([8, 11]);
    expect(result.errors.map((e) => [e.row, e.column])).toEqual([
      [2, "date"],
      [3, "student number"],
      [4, "status"],
      [5, "time in"],
      [6, "time out"],
      [7, "class end"],
      [9, "student number"],
    ]);
    expect(result.errors[0].message).toContain("must be a valid date");
    expect(result.errors[6].message).toContain("duplicate of row 8");
  });

  it("rejects a file with missing required columns", async () => {
    const table = await parseFile("missing-columns.csv", fixtureBytes("missing-columns.csv"));
    expect(() => validateTable(table)).toThrow(/Missing required columns: section, date, time in, time out, status/);
  });

  it("rejects wrong file types and empty files", async () => {
    await expect(parseFile("data.xls", fixtureBytes("attendance.csv"))).rejects.toBeInstanceOf(ImportFileError);
    await expect(parseFile("empty.csv", new Uint8Array())).rejects.toThrow(/empty/);
    await expect(parseFile("broken.xlsx", fixtureBytes("attendance.csv"))).rejects.toThrow(/could not be read/);
  });

  it("flags conflicting class times for the same class and weekday", async () => {
    const csv = [
      "student number,student name,subject code,section,date,time in,time out,status,class start,class end",
      "S1,A One,MATH,X,2026-08-03,08:00,09:00,present,08:00,09:00",
      "S2,B Two,MATH,X,2026-08-10,08:00,09:00,present,08:30,09:30",
    ].join("\n");
    const result = validateTable(await parseFile("c.csv", new TextEncoder().encode(csv)));
    expect(result.rows).toHaveLength(1);
    expect(result.errors).toEqual([
      expect.objectContaining({ row: 3, column: "class start", message: expect.stringContaining("conflict with row 2") }),
    ]);
  });
});

describe("validateTable on XLSX", () => {
  it("reads real date and time cells the same way as the CSV", async () => {
    const xlsx = validateTable(await parseFile("attendance.xlsx", fixtureBytes("attendance.xlsx")));
    const csv = validateTable(await parseFile("attendance.csv", fixtureBytes("attendance.csv")));
    expect(xlsx.errors).toEqual([]);
    expect(xlsx.rows).toEqual(csv.rows);
  });
});
