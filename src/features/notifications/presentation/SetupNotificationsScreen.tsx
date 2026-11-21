"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useRequireAuth } from "@/shared/client/hooks";
import { useTranslations } from "next-intl";
import { Button, Spinner } from "@/shared/ui/components";
import { StarBackground } from "@/shared/ui/StarBackground";
import { DraggableStar } from "@/shared/ui/mascot/DraggableStar";
import { requestNotificationPermission, showSystemNotification } from "@/shared/client/clientNotifications";
import { ROUTES } from "@/shared/config/routes";

export default function SetupNotificationsScreen() {
  const router = useRouter();
  const { status } = useRequireAuth();
  const t = useTranslations("notifications");
  const tc = useTranslations("common");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-soft">
        <div className="text-center animate-pulse">
          <Spinner className="mx-auto h-12 w-12 text-primary" />
          <p className="mt-4 text-primary font-black">{tc("action.loading")}</p>
        </div>
      </div>
    );
  }

  async function handleAllow() {
    setIsSubmitting(true);
    try {
      if ((await requestNotificationPermission()) === "granted") {
        await showSystemNotification(tc("app.reminderTitle"), { body: tc("notification.enabledThanks") });
      }
    } catch (e) {
      console.error(e);
    } finally {
      router.push(ROUTES.setup.water);
    }
  }

  return (
    <StarBackground>
      <div className="flex min-h-screen items-center justify-center p-5">
        <div className="w-full max-w-[420px] rounded-panel bg-white p-8 shadow-card">
          {/* Bell icon */}
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary-tint">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2a7 7 0 00-7 7v4.29l-1.71 1.7A1 1 0 004 17h16a1 1 0 00.71-1.71L19 13.59V9a7 7 0 00-7-7zm0 20a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
            </svg>
          </div>

          <h1 className="mb-2 text-center text-2xl font-bold text-primary">{t("setup.title")}</h1>
          <p className="mb-8 text-center text-sm leading-relaxed text-ink-subtle">
            {t("setup.description")}
          </p>

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" disabled={isSubmitting} onClick={() => router.push(ROUTES.setup.water)}>
              {t("setup.later")}
            </Button>
            <Button className="flex-1" onClick={handleAllow} loading={isSubmitting} loadingText={tc("action.processing")}>
              {t("setup.allow")}
            </Button>
          </div>
        </div>
      </div>
      <DraggableStar />
    </StarBackground>
  );
}
