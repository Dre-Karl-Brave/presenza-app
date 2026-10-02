export function StatCard({
  label,
  value,
  hint,
  loading = false,
}: {
  label: string;
  value: string;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-[6px] p-[14px_16px]">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px] leading-none">
        {label}
      </p>
      <p className="font-mono text-[30px] leading-none mt-2.5 text-foreground tracking-[-1px]">
        {loading ? "—" : value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
