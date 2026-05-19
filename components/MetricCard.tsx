interface MetricCardProps {
  label: string;
  value: string | number;
  detail?: string;
  tone?: "default" | "gold" | "success" | "warning";
}

export default function MetricCard({ label, value, detail, tone = "default" }: MetricCardProps) {
  return (
    <article className={`stat-card stat-card-${tone}`}>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {detail ? <p className="stat-detail">{detail}</p> : null}
    </article>
  );
}
