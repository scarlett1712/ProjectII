"use client";

import React, { useState, useEffect } from "react";
import { Share, PlusSquare, X, Smartphone } from "lucide-react";

export function PWAInstallPrompt() {
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
    const dismissed = localStorage.getItem("star-pwa-dismissed");
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
    localStorage.setItem("star-pwa-dismissed", Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-3 left-3 right-3 z-[9999] md:hidden animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="rounded-2xl border border-purple-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-[#A172FD]">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">
                Cài đặt Little Star vào điện thoại
              </h4>
              <p className="text-xs text-gray-500">
                Dùng như ứng dụng thật, nhanh hơn & toàn màn hình
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 rounded-xl bg-purple-50/70 p-2.5 text-xs text-purple-900">
          {isIOS ? (
            <div className="flex items-center gap-2">
              <span>Bấm nút</span>
              <Share className="inline h-4 w-4 text-[#A172FD]" />
              <span>(Chia sẻ ở Safari) rồi chọn</span>
              <span className="font-bold underline">"Thêm vào MH chính"</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>Bấm menu</span>
              <span className="font-bold">⋮</span>
              <span>(ở góc Chrome) rồi chọn</span>
              <span className="font-bold underline">"Cài đặt ứng dụng"</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
