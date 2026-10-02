"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
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
  const gradientId = "trend-area-gradient";

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartTheme.series[0]} stopOpacity={0.2} />
              <stop offset="95%" stopColor={chartTheme.series[0]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={tick} stroke={chartTheme.grid} minTickGap={32} />
          <YAxis domain={[0, 100]} unit="%" tick={tick} stroke={chartTheme.grid} width={48} />
          <Tooltip content={(props) => <ChartTooltip {...props} valueLabel={valueLabel} />} />
          <Area
            type="monotone"
            dataKey="value"
            name={valueLabel}
            stroke={chartTheme.series[0]}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={data.length <= 40 ? { r: 3, fill: chartTheme.series[0], strokeWidth: 0 } : false}
            activeDot={{ r: 5, fill: chartTheme.series[0], strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
