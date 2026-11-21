"use client";

import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";
import { IconButton } from "@/shared/ui/components";
import { AdornedInput } from "./AdornedInput";

interface PasswordInputProps extends Omit<ComponentProps<typeof AdornedInput>, "type" | "trailing"> {
  visible: boolean;
  onToggleVisible: () => void;
}

/** Password input with a visibility toggle. */
export function PasswordInput({ visible, onToggleVisible, ...props }: PasswordInputProps) {
  const t = useTranslations("auth.forgotPassword");
  return (
    <AdornedInput
      type={visible ? "text" : "password"}
      trailing={
        <IconButton label={visible ? t("hidePassword") : t("showPassword")} tabIndex={-1} onClick={onToggleVisible}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </IconButton>
      }
      {...props}
    />
  );
}
