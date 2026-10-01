"use client";

import { useState } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import { FilterBar } from "@/components/FilterBar";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { formatNumber, formatPercent } from "@/lib/format";
import {
  useBySection,
  useBySubject,
  useLowAttendance,
  useStudentReport,
  type StudentReportParams,
} from "@/lib/queries";
import { statusOf } from "@/lib/status";
import type { RouterOutputs, StudentRow } from "@/lib/types";
import { useDebouncedValue } from "@/lib/use-debounced-value";

type Stats = StudentRow["stats"];
type SubjectRow = RouterOutputs["analytics"]["bySubject"][number];
type SectionRow = RouterOutputs["analytics"]["bySection"][number];

const PAGE_SIZE = 25;
const NO_MATCH = "No attendance records match these filters.";

function statColumns<T extends { stats: Stats }>(sortable: boolean): Column<T>[] {
  return [
    { key: "present", header: "Present", numeric: true, render: (row) => formatNumber(row.stats.present) },
    { key: "late", header: "Late", numeric: true, render: (row) => formatNumber(row.stats.late) },
    {
      key: "absent",
      header: "Absent",
      numeric: true,
      sortable,
      render: (row) => formatNumber(row.stats.absent),
    },
    { key: "excused", header: "Excused", numeric: true, render: (row) => formatNumber(row.stats.excused) },
    {
      key: "attendanceRate",
      header: "Attendance rate",
      numeric: true,
      sortable,
      render: (row) => formatPercent(row.stats.attendanceRate),
    },
  ];
}

const studentColumns: Column<StudentRow>[] = [
  { key: "studentNo", header: "Student no.", sortable: true, render: (row) => row.studentNo },
  { key: "name", header: "Name", sortable: true, render: (row) => row.name },
  { key: "section", header: "Section", render: (row) => row.sectionName ?? "n/a" },
  ...statColumns<StudentRow>(true),
];

const lowColumns: Column<StudentRow>[] = [
  { key: "studentNo", header: "Student no.", render: (row) => row.studentNo },
  { key: "name", header: "Name", render: (row) => row.name },
  { key: "section", header: "Section", render: (row) => row.sectionName ?? "n/a" },
  ...statColumns<StudentRow>(false).slice(0, 4),
  {
    key: "attendanceRate",
    header: "Attendance rate",
    numeric: true,
    render: (row) => <span className="badge badge--danger">{formatPercent(row.stats.attendanceRate)}</span>,
  },
];

const subjectColumns: Column<SubjectRow>[] = [
  { key: "code", header: "Code", render: (row) => row.code },
  { key: "title", header: "Subject", render: (row) => row.title },
  ...statColumns<SubjectRow>(false),
];

const sectionColumns: Column<SectionRow>[] = [
  { key: "name", header: "Section", render: (row) => row.name },
  ...statColumns<SectionRow>(false),
];

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
    <section className="card">
      <h2 className="card__title">{title}</h2>
      {description ? <p className="card__description">{description}</p> : null}
      {actions ? <div className="card__actions">{actions}</div> : null}
      <div className="card__body">{children}</div>
    </section>
  );
}

function StudentReportCard() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<StudentReportParams["sortBy"]>("name");
  const [sortDir, setSortDir] = useState<StudentReportParams["sortDir"]>("asc");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim());

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

  return (
    <ReportCard
      title="Student report"
      description="Presents, lates, absences, and attendance rate per student."
      actions={
        <label className="field">
          <span className="field__label">Search by name or student number</span>
          <input
            className="input"
            type="search"
            value={search}
            placeholder="e.g. Reyes or 2026-00123"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
      }
    >
      <DataTable
        columns={studentColumns}
        rows={report.data?.rows ?? []}
        rowKey={(row) => row.studentId}
        status={statusOf(report, (data) => data.rows.length === 0)}
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

export function ReportsView() {
  const low = useLowAttendance();
  const sections = useBySection();
  const subjects = useBySubject();

  return (
    <>
      <PageHeader
        title="Reports"
        description="Attendance per student, section, and subject, plus students who need attention."
      />
      <FilterBar />
      <div className="stack">
        <ReportCard
          title="Low attendance"
          description="Students with an attendance rate below 80%. Use this to find who may need support, not to penalize anyone."
        >
          <DataTable
            columns={lowColumns}
            rows={low.data?.rows ?? []}
            rowKey={(row) => row.studentId}
            status={statusOf(low, (data) => data.rows.length === 0)}
            emptyMessage="No students are below 80% for these filters."
          />
        </ReportCard>

        <StudentReportCard />

        <ReportCard title="Section report">
          <DataTable
            columns={sectionColumns}
            rows={sections.data ?? []}
            rowKey={(row) => row.sectionId}
            status={statusOf(sections, (rows) => rows.length === 0)}
            emptyMessage={NO_MATCH}
          />
        </ReportCard>

        <ReportCard title="Subject report">
          <DataTable
            columns={subjectColumns}
            rows={subjects.data ?? []}
            rowKey={(row) => row.subjectId}
            status={statusOf(subjects, (rows) => rows.length === 0)}
            emptyMessage={NO_MATCH}
          />
        </ReportCard>
      </div>
    </>
  );
}
