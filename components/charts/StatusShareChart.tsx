"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartTheme } from "@/lib/chart-theme";
import type { SharePoint } from "@/lib/chart-data";
import { formatNumber } from "@/lib/format";

export function StatusShareChart({ data }: { data: SharePoint[] }) {
  const row: Record<string, number> = {};
  for (const point of data) row[point.key] = point.value;

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full h-[80px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[row]} layout="vertical" margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
            <XAxis
              type="number"
              domain={[0, 100]}
              unit="%"
              tick={{ fill: chartTheme.axis, fontSize: 10, fontFamily: "var(--font-mono)" }}
              stroke={chartTheme.grid}
            />
            <YAxis type="category" hide />
            <Tooltip
              cursor={false}
              formatter={(value, name) => [`${value}%`, String(name)]}
              contentStyle={{
                background: "var(--card)",
                borderColor: "var(--border)",
                borderRadius: "5px",
                fontSize: "12px",
                color: "var(--card-foreground)",
              }}
            />
            {data.map((point) => (
              <Bar
                key={point.key}
                dataKey={point.key}
                name={point.label}
                stackId="status"
                fill={chartTheme.status[point.key]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {data.map((point) => (
          <div key={point.key} className="flex items-center gap-2 text-[12px]">
            <span
              className="w-3 h-3 rounded-[2px] shrink-0"
              style={{ background: chartTheme.status[point.key] }}
            />
            <span className="text-foreground">{point.label}</span>
            <span className="font-mono text-muted-foreground">
              {point.value}% ({formatNumber(point.count)})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
