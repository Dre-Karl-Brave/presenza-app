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
    <div className="bg-card border border-border rounded-[5px] px-3 py-2 shadow-sm text-[12px]">
      <p className="font-semibold text-foreground font-mono">{point.label}</p>
      <p className="text-foreground/80 mt-0.5">
        {valueLabel}:{" "}
        <span className="font-mono font-medium">
          {point.value === null ? "n/a" : `${point.value}%`}
        </span>
      </p>
      {point.detail ? (
        <p className="text-muted-foreground text-[11px] mt-0.5 font-mono">{point.detail}</p>
      ) : null}
    </div>
  );
}
