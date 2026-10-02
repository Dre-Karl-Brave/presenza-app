"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartTheme } from "@/lib/chart-theme";
import type { MultiTrendPoint } from "@/lib/chart-data";

const LINES = [
  { key: "attendance", label: "Attendance rate", stroke: chartTheme.series[0], width: 2.5, dash: undefined },
  { key: "late",       label: "Late rate",        stroke: chartTheme.status.late,   width: 1.75, dash: "5 3" },
  { key: "absence",    label: "Absence rate",      stroke: chartTheme.status.absent, width: 1.75, dash: "3 3" },
] as const;

export function MultiLineTrendChart({ data }: { data: MultiTrendPoint[] }) {
  const tick = { fill: chartTheme.axis, fontSize: 12 };

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={tick} stroke={chartTheme.grid} minTickGap={32} />
          <YAxis domain={[0, 100]} unit="%" tick={tick} stroke={chartTheme.grid} width={48} />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              borderColor: "var(--border)",
              borderRadius: "6px",
              fontSize: "12px",
              color: "var(--card-foreground)",
            }}
            formatter={(value, name) => [typeof value === "number" ? `${value}%` : "—", String(name)]}
          />
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
          {LINES.map(({ key, label, stroke, width, dash }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={label}
              stroke={stroke}
              strokeWidth={width}
              strokeDasharray={dash}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
