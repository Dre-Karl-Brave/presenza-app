"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/DataTable";
import { FilterBar } from "@/components/FilterBar";
import { Pagination } from "@/components/Pagination";
import { downloadCSV } from "@/lib/export";
import { formatNumber, formatPercent, type DateFormat } from "@/lib/format";
import { useFilters } from "@/lib/filters";
import {
  useBySection,
  useBySubject,
  useLowAttendance,
  useStudentReport,
  type StudentReportParams,
} from "@/lib/queries";
import { useTRPC } from "@/lib/trpc";
import { statusOf } from "@/lib/status";
import type { RouterOutputs, StudentRow } from "@/lib/types";
import { useDebouncedValue } from "@/lib/use-debounced-value";

type Stats = StudentRow["stats"];
type SubjectRow = RouterOutputs["analytics"]["bySubject"][number];
type SectionRow = RouterOutputs["analytics"]["bySection"][number];

const PAGE_SIZE = 25;
const NO_MATCH = "No records match these filters.";

function statColumns<T extends { stats: Stats }>(sortable: boolean): Column<T>[] {
  return [
    { key: "present", header: "Present", numeric: true, render: (r) => formatNumber(r.stats.present) },
    { key: "late", header: "Late", numeric: true, render: (r) => formatNumber(r.stats.late) },
    { key: "absent", header: "Absent", numeric: true, sortable, render: (r) => formatNumber(r.stats.absent) },
    { key: "excused", header: "Excused", numeric: true, render: (r) => formatNumber(r.stats.excused) },
    {
      key: "attendanceRate",
      header: "Rate",
      numeric: true,
      sortable,
      render: (r) => formatPercent(r.stats.attendanceRate),
    },
  ];
}

const studentCols: Column<StudentRow>[] = [
  { key: "studentNo", header: "Student #", sortable: true, render: (r) => r.studentNo },
  { key: "name", header: "Name", sortable: true, render: (r) => r.name },
  { key: "section", header: "Section", render: (r) => r.sectionName ?? "—" },
  ...statColumns<StudentRow>(true),
];

const lowCols: Column<StudentRow>[] = [
  { key: "studentNo", header: "Student #", render: (r) => r.studentNo },
  { key: "name", header: "Name", render: (r) => r.name },
  { key: "section", header: "Section", render: (r) => r.sectionName ?? "—" },
  ...statColumns<StudentRow>(false).slice(0, 4),
  {
    key: "attendanceRate",
    header: "Rate",
    numeric: true,
    render: (r) => (
      <Badge variant="destructive" className="tabular-nums">
        {formatPercent(r.stats.attendanceRate)}
      </Badge>
    ),
  },
];

const subjectCols: Column<SubjectRow>[] = [
  { key: "code", header: "Code", render: (r) => r.code },
  { key: "title", header: "Subject", render: (r) => r.title },
  ...statColumns<SubjectRow>(false),
];

const sectionCols: Column<SectionRow>[] = [
  { key: "name", header: "Section", render: (r) => r.name },
  ...statColumns<SectionRow>(false),
];

const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string }[] = [
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
];

/* ── Export buttons ── */
function ExportCSVButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={onClick}
      disabled={loading}
    >
      <Download className="w-3.5 h-3.5" />
      {loading ? "Exporting…" : "CSV"}
    </Button>
  );
}

function ExportXLSXButton({
  type,
  queryString,
  dateFmt,
}: {
  type: string;
  queryString: string;
  dateFmt: DateFormat;
}) {
  const params = new URLSearchParams(queryString || "");
  params.set("type", type);
  params.set("dateFmt", dateFmt);
  const href = `/api/export?${params.toString()}`;
  return (
    <Button variant="outline" size="sm" className="gap-1.5" asChild>
      <a href={href} download>
        <Download className="w-3.5 h-3.5" />
        Excel
      </a>
    </Button>
  );
}

function ExportActions({
  csvOnClick,
  csvLoading,
  xlsxType,
  queryString,
  dateFmt,
  onDateFmtChange,
}: {
  csvOnClick: () => void;
  csvLoading?: boolean;
  xlsxType: string;
  queryString: string;
  dateFmt: DateFormat;
  onDateFmtChange: (fmt: DateFormat) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={dateFmt} onValueChange={(v) => onDateFmtChange(v as DateFormat)}>
        <SelectTrigger size="sm" className="h-8 w-[130px] text-[12px] rounded-[5px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_FORMAT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-[12px]">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ExportCSVButton onClick={csvOnClick} loading={csvLoading} />
      <ExportXLSXButton type={xlsxType} queryString={queryString} dateFmt={dateFmt} />
    </div>
  );
}

/* ── Section wrapper ── */
function ReportCard({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {description ? (
              <CardDescription className="mt-0.5">{description}</CardDescription>
            ) : null}
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/* ── Student report ── */
function StudentReportCard({ dateFmt, onDateFmtChange }: { dateFmt: DateFormat; onDateFmtChange: (fmt: DateFormat) => void }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<StudentReportParams["sortBy"]>("name");
  const [sortDir, setSortDir] = useState<StudentReportParams["sortDir"]>("asc");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const debouncedSearch = useDebouncedValue(search.trim());
  const { filter, queryString } = useFilters();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const report = useStudentReport({
    search: debouncedSearch,
    sortBy,
    sortDir,
    page,
    pageSize: PAGE_SIZE,
  });

  function handleSort(key: string) {
    const next = key as StudentReportParams["sortBy"];
    if (next === sortBy) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortBy(next);
      setSortDir("asc");
    }
    setPage(1);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const data = await queryClient.fetchQuery(
        trpc.analytics.studentReport.queryOptions({
          filter,
          sortBy: "name",
          sortDir: "asc",
          page: 1,
          pageSize: 10000,
        })
      );
      downloadCSV(
        "student-report",
        ["Student No", "Name", "Section", "Present", "Late", "Absent", "Excused", "Attendance Rate"],
        data.rows.map((r) => [
          r.studentNo,
          r.name,
          r.sectionName ?? "",
          r.stats.present,
          r.stats.late,
          r.stats.absent,
          r.stats.excused,
          formatPercent(r.stats.attendanceRate),
        ]),
        dateFmt,
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <ReportCard
      title="Student report"
      description="Presents, lates, absences, and attendance rate per student."
      actions={
        <ExportActions
          csvOnClick={handleExport}
          csvLoading={exporting}
          xlsxType="students"
          queryString={queryString}
          dateFmt={dateFmt}
          onDateFmtChange={onDateFmtChange}
        />
      }
    >
      <div className="mb-3">
        <Input
          type="search"
          value={search}
          placeholder="Search by name or student number…"
          className="max-w-sm h-8 text-sm"
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <DataTable
        columns={studentCols}
        rows={report.data?.rows ?? []}
        rowKey={(r) => r.studentId}
        status={statusOf(report, (d) => d.rows.length === 0)}
        emptyMessage={debouncedSearch ? "No student matches this search." : NO_MATCH}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
      />
      {report.data && report.data.total > 0 ? (
        <Pagination
          page={report.data.page}
          pageSize={report.data.pageSize}
          total={report.data.total}
          onPageChange={setPage}
        />
      ) : null}
    </ReportCard>
  );
}

/* ── Main view ── */
export function ReportsView() {
  const [exportingLow, setExportingLow] = useState(false);
  const [exportingSections, setExportingSections] = useState(false);
  const [exportingSubjects, setExportingSubjects] = useState(false);
  const [dateFmt, setDateFmt] = useState<DateFormat>("YYYY-MM-DD");

  const { queryString } = useFilters();
  const low = useLowAttendance();
  const sections = useBySection();
  const subjects = useBySubject();

  function exportLow() {
    if (!low.data) return;
    setExportingLow(true);
    try {
      downloadCSV(
        "low-attendance",
        ["Student No", "Name", "Section", "Present", "Late", "Absent", "Excused", "Attendance Rate"],
        low.data.rows.map((r) => [
          r.studentNo,
          r.name,
          r.sectionName ?? "",
          r.stats.present,
          r.stats.late,
          r.stats.absent,
          r.stats.excused,
          formatPercent(r.stats.attendanceRate),
        ]),
        dateFmt,
      );
    } finally {
      setExportingLow(false);
    }
  }

  function exportSections() {
    if (!sections.data) return;
    setExportingSections(true);
    try {
      downloadCSV(
        "section-report",
        ["Section", "Present", "Late", "Absent", "Excused", "Attendance Rate"],
        sections.data.map((r) => [
          r.name,
          r.stats.present,
          r.stats.late,
          r.stats.absent,
          r.stats.excused,
          formatPercent(r.stats.attendanceRate),
        ]),
        dateFmt,
      );
    } finally {
      setExportingSections(false);
    }
  }

  function exportSubjects() {
    if (!subjects.data) return;
    setExportingSubjects(true);
    try {
      downloadCSV(
        "subject-report",
        ["Code", "Subject", "Present", "Late", "Absent", "Excused", "Attendance Rate"],
        subjects.data.map((r) => [
          r.code,
          r.title,
          r.stats.present,
          r.stats.late,
          r.stats.absent,
          r.stats.excused,
          formatPercent(r.stats.attendanceRate),
        ]),
        dateFmt,
      );
    } finally {
      setExportingSubjects(false);
    }
  }

  return (
    <>
      <FilterBar />

      <div className="flex flex-col gap-4">
        <ReportCard
          title="Low attendance"
          description="Students with an attendance rate below 80%."
          actions={
            <ExportActions
              csvOnClick={exportLow}
              csvLoading={exportingLow}
              xlsxType="low-attendance"
              queryString={queryString}
              dateFmt={dateFmt}
              onDateFmtChange={setDateFmt}
            />
          }
        >
          <DataTable
            columns={lowCols}
            rows={low.data?.rows ?? []}
            rowKey={(r) => r.studentId}
            status={statusOf(low, (d) => d.rows.length === 0)}
            emptyMessage="No students are below 80% for these filters."
          />
        </ReportCard>

        <StudentReportCard dateFmt={dateFmt} onDateFmtChange={setDateFmt} />

        <ReportCard
          title="Section report"
          actions={
            <ExportActions
              csvOnClick={exportSections}
              csvLoading={exportingSections}
              xlsxType="sections"
              queryString={queryString}
              dateFmt={dateFmt}
              onDateFmtChange={setDateFmt}
            />
          }
        >
          <DataTable
            columns={sectionCols}
            rows={sections.data ?? []}
            rowKey={(r) => r.sectionId}
            status={statusOf(sections, (rows) => rows.length === 0)}
            emptyMessage={NO_MATCH}
          />
        </ReportCard>

        <ReportCard
          title="Subject report"
          actions={
            <ExportActions
              csvOnClick={exportSubjects}
              csvLoading={exportingSubjects}
              xlsxType="subjects"
              queryString={queryString}
              dateFmt={dateFmt}
              onDateFmtChange={setDateFmt}
            />
          }
        >
          <DataTable
            columns={subjectCols}
            rows={subjects.data ?? []}
            rowKey={(r) => r.subjectId}
            status={statusOf(subjects, (rows) => rows.length === 0)}
            emptyMessage={NO_MATCH}
          />
        </ReportCard>
      </div>
    </>
  );
}
