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
import type { VolumeTrendPoint } from "@/lib/chart-data";
import { formatNumber } from "@/lib/format";

export function VolumeTrendChart({ data }: { data: VolumeTrendPoint[] }) {
  const tick = { fill: chartTheme.axis, fontSize: 12 };

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }} barCategoryGap="30%">
          <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={tick} stroke={chartTheme.grid} minTickGap={32} />
          <YAxis tick={tick} stroke={chartTheme.grid} width={56} tickFormatter={(v) => formatNumber(v)} />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              borderColor: "var(--border)",
              borderRadius: "6px",
              fontSize: "12px",
              color: "var(--card-foreground)",
            }}
            formatter={(value, name) => [typeof value === "number" ? formatNumber(value) : "—", String(name)]}
          />
          <Bar
            dataKey="total"
            name="Total records"
            fill={chartTheme.series[0]}
            fillOpacity={0.25}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="counted"
            name="Counted (excl. excused)"
            fill={chartTheme.series[0]}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
