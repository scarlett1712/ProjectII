"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { clearCache } from "@/shared/client/cacheSync";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { StarBackground } from "@/shared/ui/StarBackground";
import { WelcomeLoading } from "@/shared/ui/WelcomeLoading";
import { Button, Field, FieldLabel, TextInput } from "@/shared/ui/components";
import { useTranslations } from "next-intl";
import { AuthCard } from "./components/AuthCard";
import { AuthMascotChat } from "./components/AuthMascotChat";
import { AuthNotice } from "./components/AuthNotice";
import { PasswordInput } from "./components/PasswordInput";
import { ROUTES } from "@/shared/config/routes";
import { LOGIN_RATE_LIMITED_ERROR } from "@/shared/config/auth";

function LoginContent() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const { data, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(false);

  const justRegistered = searchParams.get("registered") === "1";
  const sessionRevoked = searchParams.get("revoked") === "1";

  useEffect(() => {
    if (status === "authenticated" && data?.user?.id) router.push(ROUTES.dashboard);
  }, [data?.user?.id, router, status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", { email: email.trim(), password, redirect: false });
      if (res?.error) {
        setError(res.error === LOGIN_RATE_LIMITED_ERROR ? t("login.tooManyAttempts") : t("login.invalidCredentials"));
        return;
      }
      
      clearCache(); // Clear old cached data from previous session
      setShowLoading(true);
      setTimeout(() => {
        router.push(ROUTES.dashboard);
        router.refresh();
      }, 2500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <StarBackground>
      <AuthCard title={t("login.title")} subtitle={t("login.subtitle")}>
        {justRegistered && <AuthNotice tone="success">{t("login.justRegistered")}</AuthNotice>}
        {sessionRevoked && <AuthNotice tone="warning">{t("login.sessionRevoked")}</AuthNotice>}
        {error && <AuthNotice tone="error">{error}</AuthNotice>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label={t("field.email")}>
            <TextInput
              type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={t("login.emailPlaceholder")}
            />
          </Field>
          <div>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="password">{t("field.password")}</FieldLabel>
              <Link href={ROUTES.forgotPassword} className="mb-1.5 text-xs font-semibold text-primary hover:underline">
                {tc("auth.forgotPassword")}
              </Link>
            </div>
            <PasswordInput
              id="password" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={t("field.passwordPlaceholder")}
              visible={showPassword} onToggleVisible={() => setShowPassword((v) => !v)}
            />
          </div>
          <Button type="submit" size="lg" fullWidth loading={loading} loadingText={t("login.submitting")}>
            {t("login.submit")}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-muted">
          {t("login.noAccount")}{" "}
          <Link href={ROUTES.register} className="font-semibold text-primary hover:underline">{t("login.registerLink")}</Link>
        </p>
      </AuthCard>

      <AuthMascotChat greeting={t("chat.loginGreeting")} placeholder={t("chat.loginPlaceholder")} />

      {showLoading && <WelcomeLoading />}
    </StarBackground>
  );
}

export default function LoginScreen() {
  const tc = useTranslations("common");
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">{tc("action.loading")}</div>}>
      <LoginContent />
    </Suspense>
  );
}
