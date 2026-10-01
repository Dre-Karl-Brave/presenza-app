"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartTheme } from "@/lib/chart-theme";
import type { SharePoint } from "@/lib/chart-data";
import { formatNumber } from "@/lib/format";

// One stacked horizontal bar: each segment is a status' share of all records.
export function StatusShareChart({ data }: { data: SharePoint[] }) {
  const row: Record<string, number> = {};
  for (const point of data) row[point.key] = point.value;

  return (
    <div className="stack">
      <div className="chart chart--short">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[row]} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <XAxis
              type="number"
              domain={[0, 100]}
              unit="%"
              tick={{ fill: chartTheme.axis, fontSize: 12 }}
              stroke={chartTheme.grid}
            />
            <YAxis type="category" hide />
            <Tooltip
              cursor={false}
              formatter={(value, name) => [`${value}%`, String(name)]}
              contentStyle={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
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
      <ul className="legend">
        {data.map((point) => (
          <li key={point.key} className="legend__item">
            <span className="legend__swatch" style={{ background: chartTheme.status[point.key] }} />
            <span>
              {point.label}: {point.value}% ({formatNumber(point.count)})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
