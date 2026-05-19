interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}

export default function PageHeader({ eyebrow, title, subtitle, action }: PageHeaderProps) {
  return (
    <section className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      {action ? <div className="page-header-action">{action}</div> : null}
    </section>
  );
}
