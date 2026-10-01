"use client";

import { ChartCard } from "@/components/ChartCard";
import { FilterBar } from "@/components/FilterBar";
import { PageHeader } from "@/components/PageHeader";
import { BarComparisonChart } from "@/components/charts/BarComparisonChart";
import {
  absencePointsByDay,
  latePointsByHour,
  sectionPoints,
  subjectPoints,
} from "@/lib/chart-data";
import { chartTheme } from "@/lib/chart-theme";
import { useAbsencesByDayOfWeek, useBySection, useBySubject, useLateByHour } from "@/lib/queries";
import { statusOf } from "@/lib/status";

const NO_MATCH = "No attendance records match these filters.";

export function ComparisonsView() {
  const absences = useAbsencesByDayOfWeek();
  const late = useLateByHour();
  const subjects = useBySubject();
  const sections = useBySection();

  return (
    <>
      <PageHeader title="Comparisons" description="Where absences, lateness, and attendance differ." />
      <FilterBar />
      <div className="grid grid--charts">
        <ChartCard
          title="Absences by day of the week"
          description="Absence rate per weekday. Hover for the number of absences."
          status={statusOf(absences, (rows) => rows.length === 0)}
          emptyMessage={NO_MATCH}
        >
          {absences.data ? (
            <BarComparisonChart
              data={absencePointsByDay(absences.data)}
              valueLabel="Absence rate"
              color={chartTheme.status.absent}
            />
          ) : null}
        </ChartCard>

        <ChartCard
          title="Late arrivals by class hour"
          description="Late rate by the hour the class starts. Hover for the number of late arrivals."
          status={statusOf(late, (rows) => rows.length === 0)}
          emptyMessage={NO_MATCH}
        >
          {late.data ? (
            <BarComparisonChart
              data={latePointsByHour(late.data)}
              valueLabel="Late rate"
              color={chartTheme.status.late}
            />
          ) : null}
        </ChartCard>

        <ChartCard
          title="Attendance rate by subject"
          status={statusOf(subjects, (rows) => rows.length === 0)}
          emptyMessage={NO_MATCH}
        >
          {subjects.data ? (
            <BarComparisonChart
              data={subjectPoints(subjects.data)}
              valueLabel="Attendance rate"
              fullScale
            />
          ) : null}
        </ChartCard>

        <ChartCard
          title="Attendance rate by section"
          status={statusOf(sections, (rows) => rows.length === 0)}
          emptyMessage={NO_MATCH}
        >
          {sections.data ? (
            <BarComparisonChart
              data={sectionPoints(sections.data)}
              valueLabel="Attendance rate"
              fullScale
            />
          ) : null}
        </ChartCard>
      </div>
    </>
  );
}
