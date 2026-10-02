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
import type { StackedStatusPoint } from "@/lib/chart-data";

const SEGMENTS = [
  { key: "present", label: "Present", color: chartTheme.status.present },
  { key: "late",    label: "Late",    color: chartTheme.status.late },
  { key: "absent",  label: "Absent",  color: chartTheme.status.absent },
  { key: "excused", label: "Excused", color: chartTheme.status.excused },
] as const;

export function StatusStackedChart({ data }: { data: StackedStatusPoint[] }) {
  const tick = { fill: chartTheme.axis, fontSize: 12 };
  const height = Math.max(220, data.length * 44 + 60);

  return (
    <div className="flex flex-col gap-3">
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              unit="%"
              tick={tick}
              stroke={chartTheme.grid}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={tick}
              stroke={chartTheme.grid}
              width={110}
            />
            <Tooltip
              cursor={{ fill: chartTheme.grid, opacity: 0.3 }}
              contentStyle={{
                background: "var(--card)",
                borderColor: "var(--border)",
                borderRadius: "6px",
                fontSize: "12px",
                color: "var(--card-foreground)",
              }}
              formatter={(value, name) => [typeof value === "number" ? `${value}%` : "—", String(name)]}
            />
            {SEGMENTS.map(({ key, label, color }, i) => (
              <Bar
                key={key}
                dataKey={key}
                name={label}
                stackId="s"
                fill={color}
                isAnimationActive={false}
                radius={
                  i === SEGMENTS.length - 1 ? [0, 4, 4, 0] : undefined
                }
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {SEGMENTS.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
