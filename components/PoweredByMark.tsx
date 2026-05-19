interface PoweredByMarkProps {
  className?: string;
  compact?: boolean;
}

export default function PoweredByMark({ className = "", compact = false }: PoweredByMarkProps) {
  return (
    <span
      aria-label="Powered by MHHORIZON version 1.2.0"
      className={`powered-signature ${compact ? "powered-signature-compact" : ""} ${className}`.trim()}
    >
      <span className="powered-signature-spark" aria-hidden="true" />
      <span className="powered-signature-copy">
        <span>Powered by</span>
        <strong>MHHORIZON</strong>
      </span>
      <span className="powered-version">v1.2.0</span>
    </span>
  );
}
