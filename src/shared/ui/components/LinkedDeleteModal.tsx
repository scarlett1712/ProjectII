"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "./Button";
import { Modal } from "./Modal";

export interface LinkedDeleteOption {
  key: string;
  label: string;
}

interface LinkedDeleteModalProps {
  open: boolean;
  title?: string;
  message: string;
  options: LinkedDeleteOption[];
  onClose: () => void;
  onConfirm: (selectedKeys: Set<string>) => Promise<void> | void;
}

/** Confirmation modal with checkboxes to optionally delete linked records across modules. */
export function LinkedDeleteModal({
  open,
  title,
  message,
  options,
  onClose,
  onConfirm,
}: LinkedDeleteModalProps) {
  const tc = useTranslations("common");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setSelected(new Set());
  }, [open]);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(selected);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title || tc("action.confirmDelete")} size="sm">
      <div className="space-y-4">
        <p className="text-sm font-medium text-ink">{message}</p>

        {options.length > 0 && (
          <div className="space-y-2 rounded-2xl border border-line bg-surface-muted p-3">
            {options.map((opt) => (
              <label key={opt.key} className="flex cursor-pointer items-center gap-2.5 text-xs font-bold text-ink">
                <input
                  type="checkbox"
                  checked={selected.has(opt.key)}
                  onChange={() => toggle(opt.key)}
                  className="h-4 w-4 accent-primary cursor-pointer"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={submitting}>
            {tc("action.cancel")}
          </Button>
          <Button variant="danger" className="flex-1" loading={submitting} onClick={handleConfirm}>
            {tc("action.delete")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
