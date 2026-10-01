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
    <div className="card">
      <p className="stat__label">{label}</p>
      <p className="stat__value">{loading ? "…" : value}</p>
      {hint ? <p className="stat__hint">{hint}</p> : null}
    </div>
  );
}
