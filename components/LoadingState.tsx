import BrandLogo from "@/components/BrandLogo";

interface LoadingStateProps {
  label?: string;
  mode?: "page" | "inline";
}

export default function LoadingState({ label = "Loading FocusForge", mode = "page" }: LoadingStateProps) {
  const shellClass =
    mode === "page"
      ? "page-loading-shell"
      : "flex min-h-[16rem] items-center justify-center px-4";

  return (
    <div className={shellClass}>
      <div className="loading-panel card flex w-full max-w-sm flex-col items-center gap-5 px-6 py-8 text-center sm:px-9">
        <BrandLogo className="forge-loader p-3" />
        <div>
          <p className="text-base font-bold text-forge-text">{label}</p>
          <p className="mt-1 text-sm font-bold uppercase tracking-[0.16em] text-forge-muted">Forging your focus</p>
        </div>
      </div>
    </div>
  );
}
