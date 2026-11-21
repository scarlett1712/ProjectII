"use client";

import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendTestPushNotification,
  showSystemNotification,
  type NotificationPermissionState,
} from "@/shared/client/clientNotifications";
import { useToast } from "@/shared/ui/components";

const subscribeNoop = () => () => undefined;

/**
 * Device notification permission and actions to enable notifications or send a test.
 * Read permission after hydration. The server uses "default" to keep the initial UI consistent.
 */
export function useDeviceNotifications() {
  const t = useTranslations("shell.deviceNotifications");
  const tc = useTranslations("common");
  const toast = useToast();
  // Read permission on each render. Increment version after requesting permission to trigger a render.
  const [, setVersion] = useState(0);
  const permission = useSyncExternalStore<NotificationPermissionState>(
    subscribeNoop,
    getNotificationPermission,
    () => "default",
  );
  const [isTesting, setIsTesting] = useState(false);

  const enable = async () => {
    const result = await requestNotificationPermission().catch(() => "denied" as const);
    setVersion((v) => v + 1);
    if (result === "unsupported") {
      toast.error(t("unsupported"));
    } else if (result === "granted") {
      await showSystemNotification(tc("app.reminderTitle"), { body: tc("notification.enabledThanks") });
      toast.success(t("enabled"));
    } else {
      toast.error(t("denied"));
    }
  };

  const sendTest = async () => {
    setIsTesting(true);
    try {
      const outcome = await sendTestPushNotification(t("test.localTitle"), t("test.localBody"));
      setVersion((v) => v + 1);
      switch (outcome.status) {
        case "unsupported":
          toast.error(t("unsupported"));
          break;
        case "denied":
          toast.error(t("test.denied"));
          break;
        case "localOnly":
          toast.info(t("test.localOnly"));
          break;
        case "sent":
          toast.success(outcome.message || t("test.sent"));
          break;
        case "failed":
          toast.error(outcome.message || t("test.failed"));
          break;
      }
    } finally {
      setIsTesting(false);
    }
  };

  return { permission, enable, sendTest, isTesting };
}
