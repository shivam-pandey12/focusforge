interface StatusMessageProps {
  tone: "success" | "error" | "warning" | "info";
  children: React.ReactNode;
  className?: string;
}

export default function StatusMessage({ tone, children, className = "" }: StatusMessageProps) {
  return <div className={`status-box status-${tone} ${className}`.trim()}>{children}</div>;
}
