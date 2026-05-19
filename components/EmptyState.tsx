import BrandLogo from "@/components/BrandLogo";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="card-muted flex flex-col items-center justify-center px-7 py-12 text-center sm:px-10 sm:py-14">
      <BrandLogo className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-forge-line" />
      <h3 className="text-xl font-bold text-forge-text sm:text-2xl">{title}</h3>
      <p className="mt-3 max-w-md text-base leading-7 text-forge-muted">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
