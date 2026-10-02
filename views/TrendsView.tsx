"use client";

import { useState } from "react";
import { FilterBar } from "@/components/FilterBar";
import { ChartCard } from "@/components/ChartCard";
import { StateView } from "@/components/StateView";
import { LineTrendChart } from "@/components/charts/LineTrendChart";
import { MultiLineTrendChart } from "@/components/charts/MultiLineTrendChart";
import { VolumeTrendChart } from "@/components/charts/VolumeTrendChart";
import { trendPoints, multiTrendPoints, volumeTrendPoints } from "@/lib/chart-data";
import { useTrend } from "@/lib/queries";
import { statusOf } from "@/lib/status";
import type { Granularity } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS: { key: Granularity; label: string }[] = [
  { key: "day",   label: "Daily" },
  { key: "week",  label: "Weekly" },
  { key: "month", label: "Monthly" },
];

function SegmentedControl({
  value,
  onChange,
}: {
  value: Granularity;
  onChange: (v: Granularity) => void;
}) {
  return (
    <div className="flex border border-border rounded-[5px] overflow-hidden bg-secondary">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            "px-3 py-1 text-[12px] font-medium transition-colors border-r border-border last:border-r-0",
            value === tab.key
              ? "bg-card text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-card/60"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function TrendsView() {
  const [granularity, setGranularity] = useState<Granularity>("week");
  const trend = useTrend(granularity);
  const status = statusOf(trend, (rows) => rows.length === 0);
  const d = trend.data;

  const granLabel = TABS.find((t) => t.key === granularity)!.label.toLowerCase();

  return (
    <>
      <FilterBar />

      {/* Granularity selector lives at page level — all charts respond to it */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Showing <strong>{granLabel}</strong> data for the filtered period.
        </p>
        <SegmentedControl value={granularity} onChange={setGranularity} />
      </div>

      {/* Row 1 — main attendance rate trend */}
      <ChartCard
        title="Attendance rate over time"
        description={`${granLabel.charAt(0).toUpperCase() + granLabel.slice(1)} attendance rate — present + late ÷ non-excused.`}
        status={status}
        emptyMessage="No attendance records match these filters."
      >
        {d ? <LineTrendChart data={trendPoints(d, granularity)} /> : null}
      </ChartCard>

      {/* Row 2 — multi-line rate comparison */}
      <ChartCard
        title="Rate comparison"
        description="Attendance, late, and absence rates plotted together. Dashes = late / absence."
        status={status}
        emptyMessage="No attendance records match these filters."
      >
        {d ? <MultiLineTrendChart data={multiTrendPoints(d, granularity)} /> : null}
      </ChartCard>

      {/* Row 3 — two charts side by side */}
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard
          title="Records volume"
          description="Total vs counted (excused excluded) records per period."
          status={status}
          emptyMessage="No attendance records match these filters."
        >
          {d ? <VolumeTrendChart data={volumeTrendPoints(d, granularity)} /> : null}
        </ChartCard>

        <ChartCard
          title="Late arrivals over time"
          description={`Late rate per ${granLabel} period.`}
          status={status}
          emptyMessage="No attendance records match these filters."
        >
          {d ? (
            <LineTrendChart
              data={d.map((row) => ({
                label:
                  granularity === "month"
                    ? row.bucket.slice(0, 7)
                    : granularity === "week"
                      ? `Wk ${row.bucket.slice(5, 10)}`
                      : row.bucket,
                value:
                  row.stats.lateRate !== null
                    ? Math.round(row.stats.lateRate * 1000) / 10
                    : null,
                detail: `${row.stats.late} late arrivals`,
              }))}
              valueLabel="Late rate"
            />
          ) : null}
        </ChartCard>
      </div>

      {/* Row 4 — absence rate trend */}
      <ChartCard
        title="Absence rate over time"
        description={`Absence rate per ${granLabel} period. Excused records are excluded from the calculation.`}
        status={status}
        emptyMessage="No attendance records match these filters."
      >
        {d ? (
          <LineTrendChart
            data={d.map((row) => ({
              label:
                granularity === "month"
                  ? row.bucket.slice(0, 7)
                  : granularity === "week"
                    ? `Wk ${row.bucket.slice(5, 10)}`
                    : row.bucket,
              value:
                row.stats.absenceRate !== null
                  ? Math.round(row.stats.absenceRate * 1000) / 10
                  : null,
              detail: `${row.stats.absent} absences`,
            }))}
            valueLabel="Absence rate"
          />
        ) : null}
      </ChartCard>
    </>
  );
}
