"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { Button, Field, FieldLabel, Modal, TextInput } from "@/shared/ui/components";
import { ROUTES } from "@/shared/config/routes";

export interface PasswordFormValues {
  currentPw: string;
  newPw: string;
  confirmPw: string;
}

interface ChangePasswordModalProps {
  open: boolean;
  /** Closing via backdrop, Escape or the close button clears both error and success messages. */
  onClose: () => void;
  /** Cancel button. */
  onCancel: () => void;
  values: PasswordFormValues;
  onChange: (patch: Partial<PasswordFormValues>) => void;
  onSubmit: (event: React.FormEvent) => void;
  onForgotPassword: () => void;
  loading: boolean;
  error: string | null;
  success: string | null;
}

/** Password change modal with fields for the current password, new password and confirmation. */
export function ChangePasswordModal({
  open,
  onClose,
  onCancel,
  values,
  onChange,
  onSubmit,
  onForgotPassword,
  loading,
  error,
  success,
}: ChangePasswordModalProps) {
  const tShell = useTranslations("shell");
  const tc = useTranslations("common");
  const currentPwId = useId();

  return (
    <Modal open={open} onClose={onClose} title={tc("auth.changePassword")} size="md">
      <p className="mb-5 text-xs text-ink-muted">{tShell("changePassword.subtitle")}</p>

      {success && (
        <div className="mb-4 w-full rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center text-xs font-bold text-emerald-700">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-4 w-full rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs font-bold text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="w-full space-y-3.5">
        <div>
          <div className="flex justify-between gap-2">
            <FieldLabel htmlFor={currentPwId}>{tShell("changePassword.currentLabel")}</FieldLabel>
            <Link href={ROUTES.forgotPassword} onClick={onForgotPassword} className="text-caption font-bold text-primary hover:underline">
              {tc("auth.forgotPassword")}
            </Link>
          </div>
          <TextInput
            id={currentPwId}
            type="password"
            required
            value={values.currentPw}
            onChange={(e) => onChange({ currentPw: e.target.value })}
            placeholder={tShell("changePassword.currentPlaceholder")}
          />
        </div>

        <Field label={tc("auth.newPasswordLabel")}>
          <TextInput
            type="password"
            required
            value={values.newPw}
            onChange={(e) => onChange({ newPw: e.target.value })}
            placeholder={tShell("changePassword.newPlaceholder")}
          />
        </Field>

        <Field label={tc("auth.confirmNewPasswordLabel")}>
          <TextInput
            type="password"
            required
            value={values.confirmPw}
            onChange={(e) => onChange({ confirmPw: e.target.value })}
            placeholder={tShell("changePassword.confirmPlaceholder")}
          />
        </Field>

        <div className="flex gap-3 pt-4">
          <Button variant="secondary" className="flex-1" disabled={loading} onClick={onCancel}>
            {tc("action.cancel")}
          </Button>
          <Button type="submit" className="flex-1" loading={loading} loadingText={tc("action.saving")}>
            {tc("action.update")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
