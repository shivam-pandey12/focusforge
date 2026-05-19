"use client";

interface GoogleAuthButtonProps {
  label: string;
  loading: boolean;
  onClick: () => void;
}

export default function GoogleAuthButton({ label, loading, onClick }: GoogleAuthButtonProps) {
  return (
    <button className="btn-secondary w-full gap-3" type="button" onClick={onClick} disabled={loading}>
      <span
        aria-hidden="true"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-forge-line bg-white text-base font-bold text-forge-text"
      >
        G
      </span>
      {loading ? "Opening Google" : label}
    </button>
  );
}
