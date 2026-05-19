"use client";

import { useCallback, useRef, useState } from "react";

import ConfirmDialog, { type ConfirmDialogTone } from "@/components/ConfirmDialog";

export interface ConfirmDialogOptions {
  eyebrow?: string;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmDialogTone;
}

export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmDialogOptions | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const close = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback((nextOptions: ConfirmDialogOptions) => {
    resolverRef.current?.(false);

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOptions(nextOptions);
    });
  }, []);

  const confirmDialog = options ? (
    <ConfirmDialog
      open
      cancelLabel={options.cancelLabel}
      confirmLabel={options.confirmLabel}
      description={options.description}
      eyebrow={options.eyebrow}
      title={options.title}
      tone={options.tone}
      onCancel={() => close(false)}
      onConfirm={() => close(true)}
    />
  ) : null;

  return { confirm, confirmDialog };
}
