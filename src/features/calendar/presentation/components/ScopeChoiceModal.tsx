"use client";

import type { ReactNode } from "react";
import { Button, Modal, type ButtonVariant } from "@/shared/ui/components";

export interface ScopeChoice {
  key: string;
  label: ReactNode;
  variant: ButtonVariant;
  onSelect: () => void;
}

interface ScopeChoiceModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  message: ReactNode;
  /** Vertically stacked scope options, such as this occurrence, this and later occurrences, or the whole series. */
  choices: readonly ScopeChoice[];
}

/** Recurring-series scope dialog with one button per choice. */
export function ScopeChoiceModal({ open, onClose, title, message, choices }: ScopeChoiceModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <p className="mb-6 text-sm font-semibold text-ink-secondary">{message}</p>
      <div className="flex flex-col gap-2">
        {choices.map((choice) => (
          <Button key={choice.key} variant={choice.variant} size="lg" fullWidth onClick={choice.onSelect}>
            {choice.label}
          </Button>
        ))}
      </div>
    </Modal>
  );
}
