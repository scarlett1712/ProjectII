"use client";

import { useTranslations } from "next-intl";
import { ColorPicker, Field, FieldLabel, TextInput } from "@/shared/ui/components";

interface AccountFormFieldsProps {
  name: string;
  onNameChange: (name: string) => void;
  namePlaceholder: string;
  balance: string;
  onBalanceChange: (balance: string) => void;
  color: string;
  onColorChange: (color: string) => void;
}

/** Fields for creating or editing an account: name, balance and color. */
export function AccountFormFields({
  name,
  onNameChange,
  namePlaceholder,
  balance,
  onBalanceChange,
  color,
  onColorChange,
}: AccountFormFieldsProps) {
  const t = useTranslations("budget");
  return (
    <>
      <Field label={t("accountModal.name")}>
        <TextInput
          type="text"
          required
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={namePlaceholder}
        />
      </Field>
      <Field label={t("accountModal.balance")}>
        <TextInput
          type="number"
          value={balance}
          onChange={(e) => onBalanceChange(e.target.value)}
          placeholder={t("amountPlaceholder")}
        />
      </Field>
      <div>
        <FieldLabel>{t("accountModal.color")}</FieldLabel>
        <ColorPicker value={color} onChange={onColorChange} />
      </div>
    </>
  );
}
