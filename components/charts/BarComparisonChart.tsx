"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartTheme } from "@/lib/chart-theme";
import type { ChartPoint } from "@/lib/chart-data";
import { ChartTooltip } from "./ChartTooltip";

export function BarComparisonChart({
  data,
  valueLabel,
  horizontal = false,
  fullScale = false,
  color = chartTheme.series[0],
}: {
  data: ChartPoint[];
  valueLabel: string;
  horizontal?: boolean; // category labels on the left, bars grow to the right
  fullScale?: boolean; // force the value axis to 0-100%
  color?: string;
}) {
  const tick = { fill: chartTheme.axis, fontSize: 12 };
  const domain: [number, number | "auto"] = fullScale ? [0, 100] : [0, "auto"];

  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
        >
          <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
          {horizontal ? (
            <>
              <XAxis type="number" domain={domain} unit="%" tick={tick} stroke={chartTheme.grid} />
              <YAxis type="category" dataKey="label" tick={tick} stroke={chartTheme.grid} width={110} />
            </>
          ) : (
            <>
              <XAxis dataKey="label" tick={tick} stroke={chartTheme.grid} />
              <YAxis domain={domain} unit="%" tick={tick} stroke={chartTheme.grid} width={48} />
            </>
          )}
          <Tooltip
            cursor={{ fill: chartTheme.grid, opacity: 0.4 }}
            content={(props) => <ChartTooltip {...props} valueLabel={valueLabel} />}
          />
          <Bar dataKey="value" name={valueLabel} fill={color} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
