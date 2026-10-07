import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/db";
import {
  getBySection,
  getBySubject,
  getLowAttendance,
  getStudentReport,
} from "@/server/services/analytics";
import type { AnalyticsFilter } from "@/server/services/analytics/schemas";
import type { DateFormat } from "@/lib/format";

function formatDateServer(date: Date, fmt: DateFormat): string {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  if (fmt === "MM/DD/YYYY") return `${mm}/${dd}/${yyyy}`;
  if (fmt === "DD/MM/YYYY") return `${dd}/${mm}/${yyyy}`;
  return `${yyyy}-${mm}-${dd}`;
}

// ── Inline filter parsing (mirrors lib/filters.ts without "use client") ───────

function readInt(v: string | null): number | undefined {
  if (v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isInteger(n) ? n : undefined;
}

function parseFilter(params: URLSearchParams): AnalyticsFilter {
  const f: AnalyticsFilter = {};
  const day = readInt(params.get("day"));
  if (day !== undefined && day >= 1 && day <= 7) f.dayOfWeek = day;
  const hour = readInt(params.get("hour"));
  if (hour !== undefined && hour >= 0 && hour <= 23) f.hour = hour;
  const subject = readInt(params.get("subject"));
  if (subject !== undefined && subject > 0) f.subjectId = subject;
  const section = readInt(params.get("section"));
  if (section !== undefined && section > 0) f.sectionId = section;
  const week = params.get("week");
  if (week && /^\d{4}-\d{2}-\d{2}$/.test(week)) f.week = week;
  const month = params.get("month");
  if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) f.month = month;
  return f;
}

// ── Shared workbook styles ─────────────────────────────────────────────────────

function styleHeader(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true, size: 11 };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7E5E4" } };
  row.border = { bottom: { style: "thin", color: { argb: "FFD6D3D1" } } };
  row.alignment = { vertical: "middle" };
  row.height = 18;
}

function rateStyle(sheet: ExcelJS.Worksheet, col: string, rowCount: number) {
  const column = sheet.getColumn(col);
  column.numFmt = "0.0%";
  // Conditional colour: <0.80 red, >=0.90 green
  sheet.addConditionalFormatting({
    ref: `${col}2:${col}${rowCount + 1}`,
    rules: [
      {
        type: "cellIs",
        operator: "lessThan",
        formulae: [0.8],
        priority: 1,
        style: { font: { color: { argb: "FFDC2626" }, bold: true } },
      },
      {
        type: "cellIs",
        operator: "greaterThan",
        formulae: [0.899],
        priority: 2,
        style: { font: { color: { argb: "FF16A34A" } } },
      },
    ],
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

function appendGeneratedNote(sheet: ExcelJS.Worksheet, dateFmt: DateFormat) {
  const generated = formatDateServer(new Date(), dateFmt);
  sheet.addRow([]);
  const noteRow = sheet.addRow([`Generated on: ${generated}`]);
  noteRow.font = { italic: true, size: 10, color: { argb: "FF888888" } };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "students";
  const rawFmt = searchParams.get("dateFmt") ?? "YYYY-MM-DD";
  const dateFmt: DateFormat =
    rawFmt === "MM/DD/YYYY" || rawFmt === "DD/MM/YYYY" ? rawFmt : "YYYY-MM-DD";
  const filter = parseFilter(searchParams);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Presenza";
  wb.created = new Date();

  let filename = "report";

  try {
    if (type === "students") {
      filename = "student-report";
      const data = await getStudentReport(db, {
        filter,
        sortBy: "name",
        sortDir: "asc",
        page: 1,
        pageSize: 10000,
      });

      const sheet = wb.addWorksheet("Student Report");
      sheet.columns = [
        { header: "Student No",      key: "studentNo", width: 16 },
        { header: "Name",            key: "name",      width: 28 },
        { header: "Section",         key: "section",   width: 16 },
        { header: "Present",         key: "present",   width: 10 },
        { header: "Late",            key: "late",      width: 10 },
        { header: "Absent",          key: "absent",    width: 10 },
        { header: "Excused",         key: "excused",   width: 10 },
        { header: "Attendance Rate", key: "rate",      width: 18 },
      ];
      styleHeader(sheet);

      for (const r of data.rows) {
        sheet.addRow({
          studentNo: r.studentNo,
          name: r.name,
          section: r.sectionName ?? "",
          present: r.stats.present,
          late: r.stats.late,
          absent: r.stats.absent,
          excused: r.stats.excused,
          rate: r.stats.attendanceRate,
        });
      }

      rateStyle(sheet, "H", data.rows.length);
      appendGeneratedNote(sheet, dateFmt);
    }

    else if (type === "low-attendance") {
      filename = "low-attendance";
      const data = await getLowAttendance(db, filter);

      const sheet = wb.addWorksheet("Low Attendance");
      sheet.columns = [
        { header: "Student No",      key: "studentNo", width: 16 },
        { header: "Name",            key: "name",      width: 28 },
        { header: "Section",         key: "section",   width: 16 },
        { header: "Present",         key: "present",   width: 10 },
        { header: "Late",            key: "late",      width: 10 },
        { header: "Absent",          key: "absent",    width: 10 },
        { header: "Excused",         key: "excused",   width: 10 },
        { header: "Attendance Rate", key: "rate",      width: 18 },
      ];
      styleHeader(sheet);

      for (const r of data.rows) {
        sheet.addRow({
          studentNo: r.studentNo,
          name: r.name,
          section: r.sectionName ?? "",
          present: r.stats.present,
          late: r.stats.late,
          absent: r.stats.absent,
          excused: r.stats.excused,
          rate: r.stats.attendanceRate,
        });
      }

      rateStyle(sheet, "H", data.rows.length);
      appendGeneratedNote(sheet, dateFmt);
    }

    else if (type === "sections") {
      filename = "section-report";
      const rows = await getBySection(db, filter);

      const sheet = wb.addWorksheet("Section Report");
      sheet.columns = [
        { header: "Section",         key: "name",    width: 20 },
        { header: "Present",         key: "present", width: 10 },
        { header: "Late",            key: "late",    width: 10 },
        { header: "Absent",          key: "absent",  width: 10 },
        { header: "Excused",         key: "excused", width: 10 },
        { header: "Attendance Rate", key: "rate",    width: 18 },
      ];
      styleHeader(sheet);

      for (const r of rows) {
        sheet.addRow({
          name: r.name,
          present: r.stats.present,
          late: r.stats.late,
          absent: r.stats.absent,
          excused: r.stats.excused,
          rate: r.stats.attendanceRate,
        });
      }

      rateStyle(sheet, "F", rows.length);
      appendGeneratedNote(sheet, dateFmt);
    }

    else if (type === "subjects") {
      filename = "subject-report";
      const rows = await getBySubject(db, filter);

      const sheet = wb.addWorksheet("Subject Report");
      sheet.columns = [
        { header: "Code",            key: "code",    width: 14 },
        { header: "Subject",         key: "title",   width: 32 },
        { header: "Present",         key: "present", width: 10 },
        { header: "Late",            key: "late",    width: 10 },
        { header: "Absent",          key: "absent",  width: 10 },
        { header: "Excused",         key: "excused", width: 10 },
        { header: "Attendance Rate", key: "rate",    width: 18 },
      ];
      styleHeader(sheet);

      for (const r of rows) {
        sheet.addRow({
          code: r.code,
          title: r.title,
          present: r.stats.present,
          late: r.stats.late,
          absent: r.stats.absent,
          excused: r.stats.excused,
          rate: r.stats.attendanceRate,
        });
      }

      rateStyle(sheet, "G", rows.length);
      appendGeneratedNote(sheet, dateFmt);
    }

    else {
      return NextResponse.json({ error: "Unknown report type." }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
