"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Bell, BellOff } from "lucide-react";
import { cn } from "@/shared/ui/components";
import { promptNotificationPermission } from "../notificationPermission";

interface NotificationToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  /** Use "bell" for the calendar form or "switch" for dashboard notes. */
  variant?: "bell" | "switch";
  ariaLabel?: string;
}

/** Toggle reminders. The first activation requests browser notification permission. */
export function NotificationToggle({ value, onChange, variant = "bell", ariaLabel }: NotificationToggleProps) {
  const tc = useTranslations("common");
  const toggle = () => {
    const next = !value;
    onChange(next);
    if (next) promptNotificationPermission();
  };

  if (variant === "switch") {
    return (
      <button
        type="button"
        onClick={toggle}
        className={cn("relative h-6 w-11 cursor-pointer rounded-full transition-colors", value ? "bg-primary" : "bg-black/10")}
        role="switch"
        aria-checked={value}
        aria-label={ariaLabel}
      >
        <motion.span
          className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm"
          animate={{ x: value ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
    );
  }

  const label = value ? tc("schedule.notificationOn") : tc("schedule.notificationOff");
  return (
    <button
      type="button"
      onClick={toggle}
      className={cn("rounded-xl p-2 transition-all", value ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-400")}
      title={label}
      aria-label={ariaLabel ?? label}
      aria-pressed={value}
    >
      {value ? <Bell className="h-5 w-5 animate-bounce" /> : <BellOff className="h-5 w-5" />}
    </button>
  );
}
