import type { ChartPoint } from "@/lib/chart-data";

type TooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ChartPoint }>;
};

export function ChartTooltip({
  active,
  payload,
  valueLabel,
}: TooltipProps & { valueLabel: string }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{point.label}</p>
      <p>
        {valueLabel}: {point.value === null ? "n/a" : `${point.value}%`}
      </p>
      {point.detail ? <p className="chart-tooltip__detail">{point.detail}</p> : null}
    </div>
  );
}
