"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { StarBackground } from "@/components/StarBackground";
import { DraggableStar } from "@/components/DraggableStar";

export default function SetupNotificationsPage() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F3FF]">
        <div className="text-center animate-pulse">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#A172FD] border-t-transparent mx-auto"></div>
          <p className="mt-4 text-[#A172FD] font-black">Đang tải...</p>
        </div>
      </div>
    );
  }

  function handleAllow() {
    if ("Notification" in window) {
      Notification.requestPermission().finally(() => {
        router.push("/setup/water");
      });
    } else {
      router.push("/setup/water");
    }
  }

  return (
    <StarBackground>
      <div className="flex min-h-screen items-center justify-center p-5">
        <div className="w-full max-w-[420px] rounded-[28px] bg-white p-8 shadow-[0_20px_60px_rgba(100,70,180,0.18)]">
          {/* Bell icon */}
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-[#ede9fe]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-[#A172FD]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2a7 7 0 00-7 7v4.29l-1.71 1.7A1 1 0 004 17h16a1 1 0 00.71-1.71L19 13.59V9a7 7 0 00-7-7zm0 20a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
            </svg>
          </div>

          <h1 className="mb-2 text-center text-2xl font-bold text-[#A172FD]">Thiết lập thông báo</h1>
          <p className="mb-8 text-center text-sm leading-relaxed text-[#9ca3af]">
            Star sẽ giúp thông báo cho bạn về công việc hay thời gian ăn, uống. Bạn sẽ cho phép mình chứ?
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/setup/water")}
              className="flex-1 rounded-xl border border-[#e5e7eb] py-2.5 font-medium text-[#6b7280] transition hover:bg-gray-50"
            >
              Sau
            </button>
            <button
              type="button"
              onClick={handleAllow}
              className="flex-1 rounded-xl bg-[#A172FD] py-2.5 font-semibold text-white transition hover:bg-[#6d28d9]"
            >
              Cho phép
            </button>
          </div>
        </div>
      </div>
      <DraggableStar />
    </StarBackground>
  );
}
