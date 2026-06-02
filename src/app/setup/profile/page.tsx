"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { StarBackground } from "@/components/StarBackground";
import { DraggableStar } from "@/components/DraggableStar";

export default function SetupProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const userEmail = session?.user?.email || "";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState("");
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (userEmail) {
      // Landed on setup page -> new signup for this account
      localStorage.setItem(`is-new-signup-${userEmail}`, "true");
      localStorage.removeItem(`star-tour-completed-dashboard-${userEmail}`);
      localStorage.removeItem(`star-tour-completed-nutrition-meal-${userEmail}`);
      localStorage.removeItem(`star-tour-completed-nutrition-water-${userEmail}`);
      localStorage.removeItem(`star-tour-completed-calendar-${userEmail}`);
      
      // Also write global ones as fallback
      localStorage.setItem("is-new-signup", "true");
      localStorage.removeItem("star-tour-completed-dashboard");
      localStorage.removeItem("star-tour-completed-nutrition-meal");
      localStorage.removeItem("star-tour-completed-nutrition-water");
      localStorage.removeItem("star-tour-completed-calendar");
    }
  }, [userEmail]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "Người dùng",
          gender: gender || null,
          age: age === "" ? null : Number(age),
          heightCm: height === "" ? null : Number(height),
          weightKg: weight === "" ? null : Number(weight),
          activityLevel: activity || null,
        }),
      });
      router.push("/setup/notifications");
    } finally {
      setLoading(false);
    }
  }

  return (
    <StarBackground>
      <div className="flex min-h-screen items-center justify-center p-5">
        <div className="w-full max-w-[480px] rounded-[28px] bg-white p-8 shadow-[0_20px_60px_rgba(100,70,180,0.18)]">
          <h1 className="mb-1 text-center text-3xl font-bold text-[#A172FD]">Thiết lập tài khoản</h1>
          <p className="mb-6 text-center text-sm leading-relaxed text-[#9ca3af]">
            Bonjour! Lần đầu gặp nhau, cùng tìm hiểu nhau nào:3<br />
            Mình là <span className="font-semibold text-[#A172FD]">Little Star</span>, là người sẽ đồng hành với bạn cùng<br />
            sắp xếp lại cuộc sống nà.<br />
            <em>Cho mình tìm hiểu về bạn được không?</em>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-[#374151]">Tên người dùng (Tùy chọn)</label>
              <input
                id="name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Người dùng"
                className="w-full rounded-xl border border-transparent bg-[#f0ecff] px-4 py-2.5 text-sm text-gray-900 font-bold placeholder:text-[#9ca3af] outline-none transition focus:border-[#a78bfa] focus:ring-2 focus:ring-[#c4b5fd]/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="gender" className="mb-1 block text-sm font-medium text-[#374151]">Giới tính</label>
                <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-xl border border-transparent bg-[#f0ecff] px-4 py-2.5 text-sm text-gray-900 font-bold outline-none transition focus:border-[#a78bfa] focus:ring-2 focus:ring-[#c4b5fd]/50">
                  <option value="" disabled>Chọn giới tính</option>
                  <option value="FEMALE">Nữ</option>
                  <option value="MALE">Nam</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>
              <div>
                <label htmlFor="age" className="mb-1 block text-sm font-medium text-[#374151]">Tuổi</label>
                <input id="age" type="number" value={age} onChange={(e) => setAge(e.target.value)}
                  placeholder="Ví dụ: 21"
                  className="w-full rounded-xl border border-transparent bg-[#f0ecff] px-4 py-2.5 text-sm text-gray-900 font-bold placeholder:text-[#9ca3af] outline-none transition focus:border-[#a78bfa] focus:ring-2 focus:ring-[#c4b5fd]/50" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="height" className="mb-1 block text-sm font-medium text-[#374151]">Chiều cao</label>
                <div className="relative">
                  <input id="height" type="number" value={height} onChange={(e) => setHeight(e.target.value)}
                    placeholder="Ví dụ: 154"
                    className="w-full rounded-xl border border-transparent bg-[#f0ecff] px-4 py-2.5 pr-12 text-sm text-gray-900 font-bold placeholder:text-[#9ca3af] outline-none transition focus:border-[#a78bfa] focus:ring-2 focus:ring-[#c4b5fd]/50" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#9ca3af]">cm</span>
                </div>
              </div>
              <div>
                <label htmlFor="weight" className="mb-1 block text-sm font-medium text-[#374151]">Cân nặng</label>
                <div className="relative">
                  <input id="weight" type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                    placeholder="Ví dụ: 47"
                    className="w-full rounded-xl border border-transparent bg-[#f0ecff] px-4 py-2.5 pr-12 text-sm text-gray-900 font-bold placeholder:text-[#9ca3af] outline-none transition focus:border-[#a78bfa] focus:ring-2 focus:ring-[#c4b5fd]/50" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#9ca3af]">kg</span>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="activity" className="mb-1 block text-sm font-medium text-[#374151]">Mức độ vận động</label>
              <select id="activity" value={activity} onChange={(e) => setActivity(e.target.value)}
                className="w-full rounded-xl border border-transparent bg-[#f0ecff] px-4 py-2.5 text-sm text-gray-900 font-bold outline-none transition focus:border-[#a78bfa] focus:ring-2 focus:ring-[#c4b5fd]/50">
                <option value="" disabled>Chọn mức độ vận động</option>
                <option value="SEDENTARY">Ít vận động</option>
                <option value="LIGHT">Vận động nhẹ</option>
                <option value="MODERATE">Vận động vừa</option>
                <option value="ACTIVE">Vận động nhiều</option>
                <option value="VERY_ACTIVE">Vận động rất nhiều</option>
              </select>
            </div>

            <div className="flex gap-3 mt-4">
              <button 
                type="button" 
                onClick={() => router.push("/setup/notifications")}
                className="flex-1 rounded-xl border border-[#e5e7eb] py-2.5 font-semibold text-[#6b7280] transition hover:bg-gray-50 active:scale-95"
              >
                Bỏ qua
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="flex-1 rounded-xl bg-[#A172FD] py-2.5 font-semibold text-white transition hover:bg-[#6d28d9] disabled:opacity-60 active:scale-95"
              >
                {loading ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
          </form>
        </div>
      </div>
      <DraggableStar />
    </StarBackground>
  );
}
