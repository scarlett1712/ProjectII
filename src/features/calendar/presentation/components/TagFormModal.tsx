"use client";

import { useTranslations } from "next-intl";
import type { FormEvent, ReactNode } from "react";
import { Button, ColorPicker, Field, FieldLabel, Modal, TextInput } from "@/shared/ui/components";
import { colors } from "@/shared/theme/tokens";

interface TagFormModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  name: string;
  onNameChange: (name: string) => void;
  color: string;
  onColorChange: (color: string) => void;
  onSubmit: (e: FormEvent) => void;
  submitLabel: ReactNode;
  namePlaceholder?: string;
}

/** Tag name and color form shared by creation and editing. */
export function TagFormModal({
  open,
  onClose,
  title,
  name,
  onNameChange,
  color,
  onColorChange,
  onSubmit,
  submitLabel,
  namePlaceholder,
}: TagFormModalProps) {
  const t = useTranslations("calendar");
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={t("tagModal.name")}>
          <TextInput
            required
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={namePlaceholder}
          />
        </Field>

        <div>
          <FieldLabel>{t("tagModal.color")}</FieldLabel>
          <ColorPicker value={color || colors.primary} onChange={onColorChange} />
        </div>

        <Button type="submit" fullWidth>
          {submitLabel}
        </Button>
      </form>
    </Modal>
  );
}
