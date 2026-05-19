interface ProgressBarProps {
  value: number;
  label?: string;
}

export default function ProgressBar({ value, label }: ProgressBarProps) {
  const safeValue = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div>
      {label ? (
        <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-forge-muted">
          <span>{label}</span>
          <span>{safeValue}%</span>
        </div>
      ) : null}
      <div className="h-3 overflow-hidden rounded-full bg-forge-surfaceAlt">
        <div
          className="h-full rounded-full bg-forge-gold transition-all duration-500"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}
