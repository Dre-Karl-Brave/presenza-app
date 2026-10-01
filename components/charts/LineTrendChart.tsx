"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartTheme } from "@/lib/chart-theme";
import type { ChartPoint } from "@/lib/chart-data";
import { ChartTooltip } from "./ChartTooltip";

export function LineTrendChart({
  data,
  valueLabel = "Attendance rate",
}: {
  data: ChartPoint[];
  valueLabel?: string;
}) {
  const tick = { fill: chartTheme.axis, fontSize: 12 };

  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={tick} stroke={chartTheme.grid} minTickGap={32} />
          <YAxis domain={[0, 100]} unit="%" tick={tick} stroke={chartTheme.grid} width={48} />
          <Tooltip content={(props) => <ChartTooltip {...props} valueLabel={valueLabel} />} />
          <Line
            type="monotone"
            dataKey="value"
            name={valueLabel}
            stroke={chartTheme.series[0]}
            strokeWidth={2}
            dot={data.length <= 40}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
