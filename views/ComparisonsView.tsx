"use client";

import { ChartCard } from "@/components/ChartCard";
import { FilterBar } from "@/components/FilterBar";
import { BarComparisonChart } from "@/components/charts/BarComparisonChart";
import { StatusStackedChart } from "@/components/charts/StatusStackedChart";
import {
  absencePointsByDay,
  latePointsByHour,
  sectionPoints,
  sectionStackedPoints,
  subjectPoints,
  subjectStackedPoints,
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
      <FilterBar />

      {/* Row 1 — day / hour patterns */}
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard
          title="Absences by day of the week"
          description="Absence rate per weekday."
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
          description="Late rate by the hour the class starts."
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
      </div>

      {/* Row 2 — attendance rate by subject / section */}
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard
          title="Attendance rate by subject"
          description="Hover a bar for the full subject title."
          status={statusOf(subjects, (rows) => rows.length === 0)}
          emptyMessage={NO_MATCH}
        >
          {subjects.data ? (
            <BarComparisonChart
              data={subjectPoints(subjects.data)}
              valueLabel="Attendance rate"
              horizontal={subjects.data.length > 5}
              fullScale
            />
          ) : null}
        </ChartCard>

        <ChartCard
          title="Attendance rate by section"
          description="Each section's overall attendance rate."
          status={statusOf(sections, (rows) => rows.length === 0)}
          emptyMessage={NO_MATCH}
        >
          {sections.data ? (
            <BarComparisonChart
              data={sectionPoints(sections.data)}
              valueLabel="Attendance rate"
              horizontal={sections.data.length > 5}
              fullScale
            />
          ) : null}
        </ChartCard>
      </div>

      {/* Row 3 — status composition per section / subject (stacked 100%) */}
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard
          title="Status composition by section"
          description="How present, late, absent, and excused records are distributed within each section."
          status={statusOf(sections, (rows) => rows.length === 0)}
          emptyMessage={NO_MATCH}
        >
          {sections.data ? (
            <StatusStackedChart data={sectionStackedPoints(sections.data)} />
          ) : null}
        </ChartCard>

        <ChartCard
          title="Status composition by subject"
          description="How present, late, absent, and excused records are distributed within each subject."
          status={statusOf(subjects, (rows) => rows.length === 0)}
          emptyMessage={NO_MATCH}
        >
          {subjects.data ? (
            <StatusStackedChart data={subjectStackedPoints(subjects.data)} />
          ) : null}
        </ChartCard>
      </div>
    </>
  );
}
