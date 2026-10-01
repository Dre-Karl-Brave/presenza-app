"use client";

import { ChartCard } from "@/components/ChartCard";
import { FilterBar } from "@/components/FilterBar";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/StateView";
import { StatCard } from "@/components/StatCard";
import { StatusShareChart } from "@/components/charts/StatusShareChart";
import { sharePoints } from "@/lib/chart-data";
import { formatNumber, formatPercent } from "@/lib/format";
import { useStatusBreakdown, useSummary } from "@/lib/queries";
import { statusOf } from "@/lib/status";

export function DashboardView() {
  const summary = useSummary();
  const breakdown = useStatusBreakdown();
  const data = summary.data;
  const loading = summary.isPending;
  const noRecords = data !== undefined && data.stats.total === 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Attendance for the semester at a glance. Excused records are left out of every rate."
      />
      <FilterBar />

      {summary.isError ? (
        <div className="card">
          <EmptyState title="Could not load the dashboard" message={summary.error.message} />
        </div>
      ) : null}

      {noRecords ? (
        <div className="card">
          <EmptyState
            title="No attendance records yet"
            message="Load data into Presenza and the figures below will appear here."
          />
        </div>
      ) : null}

      <div className="grid grid--stats">
        <StatCard
          label="Attendance rate"
          value={formatPercent(data?.stats.attendanceRate)}
          hint="(present + late) ÷ (records − excused)"
          loading={loading}
        />
        <StatCard
          label="Late rate"
          value={formatPercent(data?.stats.lateRate)}
          hint={data ? `${formatNumber(data.stats.late)} late` : undefined}
          loading={loading}
        />
        <StatCard
          label="Absence rate"
          value={formatPercent(data?.stats.absenceRate)}
          hint={data ? `${formatNumber(data.stats.absent)} absent` : undefined}
          loading={loading}
        />
        <StatCard
          label="Total students"
          value={data ? formatNumber(data.totalStudents) : "0"}
          loading={loading}
        />
        <StatCard
          label="Total attendance records"
          value={data ? formatNumber(data.stats.total) : "0"}
          hint={data ? `${formatNumber(data.stats.excused)} excused` : undefined}
          loading={loading}
        />
        <StatCard
          label="Students below 80%"
          value={data ? formatNumber(data.lowAttendanceCount) : "0"}
          loading={loading}
        />
        <StatCard
          label="Highest absence weekday"
          value={data?.highestAbsenceWeekday?.name ?? "n/a"}
          hint={
            data?.highestAbsenceWeekday
              ? `${formatPercent(data.highestAbsenceWeekday.absenceRate)} absence rate`
              : undefined
          }
          loading={loading}
        />
      </div>

      <ChartCard
        title="Attendance status breakdown"
        description="Share of all records by status, excused included."
        status={statusOf(breakdown, (value) => value.stats.total === 0)}
        emptyMessage="No records match these filters."
      >
        {breakdown.data ? <StatusShareChart data={sharePoints(breakdown.data)} /> : null}
      </ChartCard>
    </>
  );
}
