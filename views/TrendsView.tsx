"use client";

import { ChartCard } from "@/components/ChartCard";
import { FilterBar } from "@/components/FilterBar";
import { PageHeader } from "@/components/PageHeader";
import { LineTrendChart } from "@/components/charts/LineTrendChart";
import { trendPoints } from "@/lib/chart-data";
import { useTrend } from "@/lib/queries";
import { statusOf } from "@/lib/status";
import type { Granularity } from "@/lib/types";

function TrendCard({
  granularity,
  title,
  description,
}: {
  granularity: Granularity;
  title: string;
  description: string;
}) {
  const trend = useTrend(granularity);
  return (
    <ChartCard
      title={title}
      description={description}
      status={statusOf(trend, (rows) => rows.length === 0)}
      emptyMessage="No attendance records match these filters."
    >
      {trend.data ? <LineTrendChart data={trendPoints(trend.data, granularity)} /> : null}
    </ChartCard>
  );
}

export function TrendsView() {
  return (
    <>
      <PageHeader title="Trends" description="How the attendance rate moves over the semester." />
      <FilterBar />
      <div className="stack">
        <TrendCard granularity="day" title="Daily attendance trend" description="Attendance rate per class day." />
        <TrendCard granularity="week" title="Weekly attendance trend" description="Attendance rate per week." />
        <TrendCard granularity="month" title="Monthly attendance trend" description="Attendance rate per month." />
      </div>
    </>
  );
}
