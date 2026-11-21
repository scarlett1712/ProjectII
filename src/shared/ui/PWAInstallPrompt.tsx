"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Share, X, Smartphone } from "lucide-react";
import { IconButton } from "@/shared/ui/components";
import { STORAGE_KEYS } from "@/shared/client/storageKeys";

export function PWAInstallPrompt() {
  const tShell = useTranslations("shell");
  const tc = useTranslations("common");
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode (installed app)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // Check if user dismissed recently
    const dismissed = localStorage.getItem(STORAGE_KEYS.pwaDismissedAt);
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) {
      return;
    }

    // Detect mobile device
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isMobileDevice = isIosDevice || /android/.test(ua);

    if (isMobileDevice) {
      setIsIOS(isIosDevice);
      // Small delay before showing so page loads smoothly
      const timer = setTimeout(() => setShowPrompt(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem(STORAGE_KEYS.pwaDismissedAt, Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-3 left-3 right-3 z-[9999] md:hidden duration-300">
      <div className="rounded-2xl border border-purple-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-primary">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">
                {tShell("pwaPrompt.title")}
              </h4>
              <p className="text-xs text-gray-500">
                {tShell("pwaPrompt.subtitle")}
              </p>
            </div>
          </div>
          <IconButton label={tc("action.close")} onClick={handleDismiss}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="mt-3 rounded-xl bg-purple-50/70 p-2.5 text-xs text-purple-900">
          {isIOS ? (
            <div className="flex items-center gap-2">
              <span>{tShell("pwaPrompt.iosTap")}</span>
              <Share className="inline h-4 w-4 text-primary" />
              <span>{tShell("pwaPrompt.iosThenChoose")}</span>
              <span className="font-bold underline">{tShell("pwaPrompt.iosAction")}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>{tShell("pwaPrompt.androidTap")}</span>
              <span className="font-bold">{tShell("pwaPrompt.androidMenuIcon")}</span>
              <span>{tShell("pwaPrompt.androidThenChoose")}</span>
              <span className="font-bold underline">{tShell("pwaPrompt.androidAction")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
