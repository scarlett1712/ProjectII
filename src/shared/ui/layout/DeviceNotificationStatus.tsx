"use client";

import { Bell, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import type { NotificationPermissionState } from "@/shared/client/clientNotifications";
import { Button, cn } from "@/shared/ui/components";

interface DeviceNotificationStatusProps {
  permission: NotificationPermissionState;
  isTesting: boolean;
  enable: () => void;
  sendTest: () => void;
}

const badgeClasses: Record<NotificationPermissionState, string> = {
  granted: "bg-green-100 text-green-700",
  denied: "bg-red-100 text-red-700",
  default: "bg-amber-100 text-amber-700",
  unsupported: "bg-gray-100 text-gray-500",
};

/** Device notification permission and controls to enable or test notifications at the bottom of the bell dropdown. */
export function DeviceNotificationStatus({ permission, isTesting, enable, sendTest }: DeviceNotificationStatusProps) {
  const t = useTranslations("shell.deviceNotifications");
  if (permission === "unsupported") return null;
  const statusKey = permission === "granted" || permission === "denied" ? permission : "default";

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-purple-100 pt-3">
      <div className="flex items-center justify-between text-caption">
        <span className="font-bold text-gray-500">{t("label")}</span>
        <span className={cn("rounded-full px-2 py-0.5 text-2xs font-black", badgeClasses[permission])}>
          {t(`status.${statusKey}`)}
        </span>
      </div>
      {permission === "granted" ? (
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          icon={<Send className="h-3.5 w-3.5" />}
          loading={isTesting}
          loadingText={t("test.sending")}
          onClick={sendTest}
        >
          {t("test.button")}
        </Button>
      ) : (
        <Button size="sm" fullWidth icon={<Bell className="h-3.5 w-3.5" />} onClick={enable}>
          {t("enable")}
        </Button>
      )}
    </div>
  );
}
