"use client";

import { useEffect } from "react";

import BrandLogo from "@/components/BrandLogo";

export type ConfirmDialogTone = "default" | "warning" | "danger";

interface ConfirmDialogProps {
  open: boolean;
  eyebrow?: string;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmDialogTone;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  eyebrow = "Please confirm",
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  busy = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [busy, onCancel, open]);

  if (!open) {
    return null;
  }

  const confirmClass = tone === "danger" ? "btn-danger" : "btn-primary";

  return (
    <div className="logout-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <button
        aria-label={cancelLabel}
        className="logout-confirm-backdrop"
        disabled={busy}
        type="button"
        onClick={onCancel}
      />
      <section className="logout-confirm-card">
        <div className="flex items-start gap-4">
          <BrandLogo className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow-glow ring-1 ring-forge-line" />
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 id="confirm-dialog-title" className="mt-2 text-2xl font-bold leading-tight text-forge-text">
              {title}
            </h2>
            <p className="mt-3 text-base leading-7 text-forge-muted">{description}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button className="btn-secondary" disabled={busy} type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={confirmClass} disabled={busy} type="button" onClick={onConfirm}>
            {busy ? "Working" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
