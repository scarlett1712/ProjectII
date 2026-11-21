"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StarBackground } from "@/shared/ui/StarBackground";
import { Button, Field, TextInput } from "@/shared/ui/components";
import { useTranslations } from "next-intl";
import { AuthCard } from "./components/AuthCard";
import { AuthMascotChat } from "./components/AuthMascotChat";
import { AuthNotice } from "./components/AuthNotice";
import { PasswordInput } from "./components/PasswordInput";
import { API_ROUTES, ROUTES } from "@/shared/config/routes";

export default function RegisterScreen() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const { data, status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && data?.user?.id) router.push(ROUTES.dashboard);
  }, [data?.user?.id, router, status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError(tc("auth.passwordMismatch")); return; }
    setLoading(true);
    try {
      const res = await fetch(API_ROUTES.auth.register, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(body.error ?? t("register.failed")); return; }

      // Auto sign in user to establish session
      const signInRes = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        setError(t("register.autoSignInFailed"));
        return;
      }

      router.push(ROUTES.setup.profile);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <StarBackground>
      <AuthCard title={t("register.title")} subtitle={t("register.subtitle")}>
        {error && <AuthNotice tone="error">{error}</AuthNotice>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label={t("field.email")}>
            <TextInput
              type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={t("register.emailPlaceholder")}
            />
          </Field>
          <Field label={t("field.password")}>
            <PasswordInput
              autoComplete="new-password" required minLength={8}
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={t("field.passwordPlaceholder")}
              visible={showPassword} onToggleVisible={() => setShowPassword((v) => !v)}
            />
          </Field>
          <Field label={t("register.confirmPassword")}>
            <PasswordInput
              autoComplete="new-password" required
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder={t("field.passwordPlaceholder")}
              visible={showConfirm} onToggleVisible={() => setShowConfirm((v) => !v)}
            />
          </Field>
          <Button type="submit" size="lg" fullWidth loading={loading} loadingText={t("register.submitting")}>
            {t("register.submit")}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-muted">
          {t("register.hasAccount")}{" "}
          <Link href={ROUTES.login} className="font-semibold text-primary hover:underline">{t("register.loginLink")}</Link>
        </p>
      </AuthCard>

      <AuthMascotChat greeting={t("chat.registerGreeting")} placeholder={t("chat.registerPlaceholder")} />
    </StarBackground>
  );
}

