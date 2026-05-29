"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { StarBackground } from "@/components/StarBackground";
import { DraggableStar } from "@/components/DraggableStar";

const DEFAULT_SLOTS = ["07:00", "09:00", "11:00", "13:30", "15:30", "17:30", "18:30", "20:00"];

export default function SetupWaterPage() {
  const router = useRouter();
  const [target, setTarget] = useState("2000");
  const [slots, setSlots] = useState<string[]>(DEFAULT_SLOTS);
  const [newSlot, setNewSlot] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((profile) => {
        if (profile && profile.weightKg) {
          const suggestedWater = Math.round(profile.weightKg * 35);
          setTarget(String(suggestedWater));
          
          // Generate realistic slots from 7 AM to 9 PM, every 2-3 hours depending on water
          const numSlots = Math.max(4, Math.min(10, Math.round(suggestedWater / 250)));
          const startHour = 7;
          const endHour = 21;
          const interval = (endHour - startHour) / (numSlots - 1);
          
          const newSlots = Array.from({ length: numSlots }).map((_, i) => {
            const h = Math.round(startHour + i * interval);
            const m = (h % 1) >= 0.5 ? 30 : 0;
            return `${String(Math.floor(h)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          });
          
          setSlots([...new Set(newSlots)].sort()); // unique and sort
          setAiMessage(`Trợ lý ảo gợi ý: Với cân nặng ${profile.weightKg}kg, bạn nên uống khoảng ${suggestedWater}ml nước mỗi ngày. Mình đã tạo sẵn các khung giờ bên dưới!`);
        }
      })
      .catch(() => undefined);
  }, []);

  function addSlot() {
    const t = newSlot.trim();
    if (t && !slots.includes(t)) {
      setSlots((prev) => [...prev, t].sort());
      setNewSlot("");
    }
  }

  function removeSlot(s: string) {
    setSlots((prev) => prev.filter((v) => v !== s));
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      await fetch("/api/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "goal", dailyTargetMl: Number(target), slots }),
      });
      localStorage.setItem("is-new-signup", "true");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <StarBackground>
      <div className="flex min-h-screen items-center justify-center p-5">
        <div className="w-full max-w-[500px] rounded-[28px] bg-white p-8 shadow-[0_20px_60px_rgba(100,70,180,0.18)] relative overflow-hidden">
          {/* Glass icon */}
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20" viewBox="0 0 64 64" fill="none">
              <path d="M18 8h28l-4 48H22L18 8z" fill="#A172FD" opacity="0.15" stroke="#A172FD" strokeWidth="2.5" strokeLinejoin="round" />
              <path d="M22 32h20" stroke="#A172FD" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
              <path d="M21 24h22" stroke="#A172FD" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
              <rect x="18" y="4" width="28" height="6" rx="2" fill="#A172FD" opacity="0.3" />
            </svg>
          </div>

          <h1 className="mb-2 text-center text-2xl font-bold text-[#A172FD]">Thiết lập lịch uống nước</h1>
          <p className="mb-4 text-center text-sm text-[#9ca3af]">
            Bạn muốn mình thông báo khi nào bạn cần uống nước chứ?
          </p>

          {aiMessage && (
            <div className="mb-6 rounded-xl bg-purple-50 p-4 border border-purple-100 flex gap-3 items-start animate-in fade-in zoom-in duration-500">
              <div className="bg-purple-200 text-purple-600 rounded-full p-2 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-sm text-purple-700 leading-relaxed font-medium">
                {aiMessage}
              </p>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label htmlFor="target" className="mb-1 block text-sm font-medium text-[#374151]">Tổng lượng nước trong ngày *</label>
              <div className="relative">
                <input id="target" type="number" value={target} onChange={(e) => setTarget(e.target.value)}
                  className="w-full rounded-xl border border-transparent bg-[#f0ecff] px-4 py-3 pr-12 text-sm text-gray-900 font-bold outline-none transition focus:border-[#a78bfa] focus:ring-2 focus:ring-[#c4b5fd]/50" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[#A172FD]">ml</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#374151]">Khung giờ nhắc *</label>
              <div className="flex flex-wrap gap-2 rounded-xl border border-[#e9d5ff] bg-[#f0ecff] p-4">
                {slots.map((s) => (
                  <button key={s} type="button" onClick={() => removeSlot(s)}
                    className="rounded-lg border border-[#d8b4fe] bg-white px-3 py-1.5 text-sm font-medium text-[#374151] transition hover:bg-red-50 hover:border-red-300 hover:text-red-500 shadow-sm flex items-center gap-1 group">
                    {s}
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                ))}
                <div className="flex items-center gap-2 mt-1">
                  <input type="time" value={newSlot} onChange={(e) => setNewSlot(e.target.value)}
                    className="rounded-lg border border-[#d8b4fe] bg-white px-3 py-1.5 text-sm font-bold text-gray-900 outline-none shadow-sm" />
                  <button type="button" onClick={addSlot}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[#A172FD] text-white shadow-md transition hover:bg-[#8b5cf6] hover:scale-105 active:scale-95">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button type="button" onClick={() => router.push("/dashboard")}
              className="flex-1 rounded-xl border-2 border-[#e5e7eb] py-3 font-semibold text-[#6b7280] transition hover:bg-gray-50 active:scale-95">
              Để sau
            </button>
            <button type="button" onClick={handleSubmit} disabled={loading}
              className="flex-1 rounded-xl bg-gradient-to-r from-[#A172FD] to-[#8b5cf6] py-3 font-semibold text-white shadow-lg transition hover:opacity-90 active:scale-95 disabled:opacity-60 disabled:scale-100">
              {loading ? "Đang lưu…" : "Xác nhận & Lưu"}
            </button>
          </div>
        </div>
      </div>
      <DraggableStar />
    </StarBackground>
  );
}
