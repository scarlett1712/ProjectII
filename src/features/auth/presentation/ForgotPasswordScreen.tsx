"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { StarBackground } from "@/shared/ui/StarBackground";
import { Mail, KeyRound, Lock, ArrowLeft, CheckCircle2, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, Field, FieldLabel } from "@/shared/ui/components";
import { AdornedInput } from "./components/AdornedInput";
import { AuthCard } from "./components/AuthCard";
import { AuthNotice } from "./components/AuthNotice";
import { PasswordInput } from "./components/PasswordInput";
import { API_ROUTES, ROUTES } from "@/shared/config/routes";
import { OTP_LENGTH, OTP_RESEND_COOLDOWN_SEC, PASSWORD_MIN_LENGTH } from "@/shared/domain/accountPolicy";

export default function ForgotPasswordScreen() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");

  // Steps: 1 = Enter Email, 2 = Enter OTP & New Password, 3 = Success
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  // Resend cooldown timer
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Step 1: Send OTP
  async function handleSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setError(t("forgotPassword.error.emailRequired"));
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(API_ROUTES.auth.forgotPassword, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("forgotPassword.error.sendOtpFailed"));
        return;
      }

      if (data.devOtp) {
        setDevOtpHint(data.devOtp);
      }
      setCountdown(OTP_RESEND_COOLDOWN_SEC);
      setStep(2);
    } catch {
      setError(t("forgotPassword.error.network"));
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Reset Password
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!otp.trim() || otp.trim().length !== OTP_LENGTH) {
      setError(t("forgotPassword.error.invalidOtp"));
      return;
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setError(tc("auth.newPasswordTooShort"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(tc("auth.passwordMismatch"));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(API_ROUTES.auth.resetPassword, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("forgotPassword.error.resetFailed"));
        return;
      }

      setStep(3);
    } catch {
      setError(t("forgotPassword.error.network"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <StarBackground>
      <AuthCard
        icon={step === 3 ? "🎉" : "🔐"}
        title={
          <>
            {step === 1 && tc("auth.forgotPassword")}
            {step === 2 && t("forgotPassword.titleVerify")}
            {step === 3 && tc("auth.passwordChanged")}
          </>
        }
        subtitle={
          <>
            {step === 1 && t("forgotPassword.subtitleEmail")}
            {step === 2 && t("forgotPassword.subtitleVerify", { email })}
            {step === 3 && t("forgotPassword.subtitleSuccess")}
          </>
        }
      >
        {/* Dev Hint if running without SMTP */}
        {devOtpHint && step === 2 && (
          <AuthNotice tone="warning">
            <span className="font-bold">{t("forgotPassword.devOtpLabel")}</span>{" "}
            <span className="font-mono font-black tracking-widest text-amber-900">{devOtpHint}</span>
          </AuthNotice>
        )}

        {error && <AuthNotice tone="error">{error}</AuthNotice>}

        {/* STEP 1: Enter Email */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <Field label={t("forgotPassword.emailLabel")}>
              <AdornedInput
                leading={<Mail className="h-4 w-4" />}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("forgotPassword.emailPlaceholder")}
              />
            </Field>

            <Button type="submit" size="lg" fullWidth loading={loading} loadingText={t("forgotPassword.sendingOtp")}>
              {t("forgotPassword.sendOtp")}
            </Button>
          </form>
        )}

        {/* STEP 2: Enter OTP & New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="otp">{t("forgotPassword.otpLabel")}</FieldLabel>
                <button
                  type="button"
                  disabled={countdown > 0 || loading}
                  onClick={() => handleSendOtp()}
                  className="mb-1.5 flex items-center gap-1 text-caption font-bold text-primary hover:underline disabled:text-gray-400 disabled:no-underline"
                >
                  <RefreshCw className="h-3 w-3" />
                  {countdown > 0 ? t("forgotPassword.resendIn", { seconds: String(countdown) }) : t("forgotPassword.resend")}
                </button>
              </div>
              {/* Center the OTP and space the digits for readability. */}
              <AdornedInput
                id="otp"
                leading={<KeyRound className="h-4 w-4" />}
                type="text"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder={t("forgotPassword.otpPlaceholder")}
                className="text-center font-mono tracking-widest"
              />
            </div>

            <Field label={tc("auth.newPasswordLabel")}>
              <PasswordInput
                leading={<Lock className="h-4 w-4" />}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("forgotPassword.passwordPlaceholder")}
                visible={showPassword}
                onToggleVisible={() => setShowPassword(!showPassword)}
              />
            </Field>

            <Field label={tc("auth.confirmNewPasswordLabel")}>
              <AdornedInput
                leading={<Lock className="h-4 w-4" />}
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("forgotPassword.passwordPlaceholder")}
              />
            </Field>

            <Button type="submit" size="lg" fullWidth loading={loading} loadingText={t("forgotPassword.resetting")}>
              {t("forgotPassword.reset")}
            </Button>
          </form>
        )}

        {/* STEP 3: Success */}
        {step === 3 && (
          <div className="text-center py-2 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <p className="text-sm font-semibold text-gray-700">
              {t("forgotPassword.successMessage")}
            </p>
            <Link
              href={ROUTES.login}
              className="inline-block w-full rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-md transition hover:bg-primary-hover"
            >
              {t("forgotPassword.loginNow")}
            </Link>
          </div>
        )}

        {/* Back to Login */}
        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <Link
            href={ROUTES.login}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-muted hover:text-primary transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("forgotPassword.backToLogin")}
          </Link>
        </div>
      </AuthCard>
    </StarBackground>
  );
}
