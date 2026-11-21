"use client";

import { useTranslations } from "next-intl";
import { ColorPicker, Field, FieldLabel, TextInput } from "@/shared/ui/components";

interface CategoryFormFieldsProps {
  nameLabel: string;
  name: string;
  onNameChange: (name: string) => void;
  namePlaceholder: string;
  color: string;
  onColorChange: (color: string) => void;
}

/** Fields for creating or editing a category: name and color. */
export function CategoryFormFields({
  nameLabel,
  name,
  onNameChange,
  namePlaceholder,
  color,
  onColorChange,
}: CategoryFormFieldsProps) {
  const t = useTranslations("budget");
  return (
    <>
      <Field label={nameLabel}>
        <TextInput
          type="text"
          required
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={namePlaceholder}
        />
      </Field>
      <div>
        <FieldLabel>{t("categoryModal.color")}</FieldLabel>
        <ColorPicker value={color} onChange={onColorChange} />
      </div>
    </>
  );
}
