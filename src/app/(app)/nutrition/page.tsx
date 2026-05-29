"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MealManagementTab } from "@/components/nutrition/MealManagementTab";
import { WaterReminderTab } from "@/components/nutrition/WaterReminderTab";
import { OnboardingTour, TourStep } from "@/components/OnboardingTour";

const mealTourSteps: TourStep[] = [
  {
    selector: "#tour-nutrition-tabs",
    title: "Chuyển đổi phân hệ",
    content: "Dễ dàng chuyển đổi giữa Nhật ký Ăn uống để theo dõi dinh dưỡng, và Nhắc lịch Uống nước để bổ sinh đủ nước mỗi ngày.",
  },
  {
    selector: "#tour-meal-views",
    title: "Chế độ xem nhật ký",
    content: "Lựa chọn xem nhật ký ăn uống dạng danh sách thông thường hoặc trực quan hóa theo Tháng, Tuần, hay Ngày.",
  },
  {
    selector: "#tour-meal-week-picker",
    title: "Bộ chọn thời gian nhanh",
    content: "Xem và chọn nhanh ngày ăn uống trong tuần hiện tại để bổ sung nhật ký dinh dưỡng.",
  },
  {
    selector: "#tour-meal-progress",
    title: "Tiến độ nạp Calo",
    content: "Theo dõi lượng Calo đã nạp vào so với mục tiêu đề ra để duy trì vóc dáng lý tưởng.",
  },
  {
    selector: "#tour-meal-add-btn",
    title: "Thêm bữa ăn mới",
    content: "Ghi chép bữa ăn của bạn bằng cách nhấn nút này. Bé Sao sẽ tự động lưu lại các chỉ số dinh dưỡng.",
  }
];

const waterTourSteps: TourStep[] = [
  {
    selector: "#tour-nutrition-tabs",
    title: "Chuyển đổi phân hệ",
    content: "Dễ dàng chuyển đổi giữa Nhật ký Ăn uống để theo dõi dinh dưỡng, và Nhắc lịch Uống nước để bổ sinh đủ nước mỗi ngày.",
  },
  {
    selector: "#tour-water-chart-box",
    title: "Theo dõi nước uống",
    content: "Hiển thị tổng lượng nước đã uống trong ngày so với mục tiêu đề ra và biểu đồ 7 ngày gần nhất.",
  },
  {
    selector: "#tour-water-quick-log",
    title: "Ghi nhanh lượng nước",
    content: "Bổ sung nhanh lượng nước đã uống bằng các cốc định lượng sẵn từ 100ml đến 500ml.",
  },
  {
    selector: "#tour-water-slots",
    title: "Khung giờ nhắc nhở",
    content: "Danh sách giờ uống nước đã cài đặt. Click dấu tick để xác nhận đã uống nước đúng giờ.",
  }
];

function NutritionTabsContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"meal" | "water">("meal");

  useEffect(() => {
    if (tabParam === "water" || tabParam === "meal") {
      setActiveTab(tabParam as any);
    }
  }, [tabParam]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Sliding Tab Selector */}
      <div className="flex justify-center mb-6">
        <div id="tour-nutrition-tabs" className="flex bg-white/60 p-1.5 rounded-full text-sm font-bold shadow-sm border border-purple-100/50 backdrop-blur-sm">
          <button 
            onClick={() => setActiveTab("meal")}
            className={`flex items-center gap-2 px-8 py-3 rounded-full transition-all duration-300 ${
              activeTab === "meal" 
                ? "bg-[#A172FD] text-white shadow-md scale-105" 
                : "text-[#6B7280] hover:text-[#A172FD]"
            }`}
          >
            <span className="text-base">🍽️</span>
            Nhật ký Ăn uống
          </button>
          <button 
            onClick={() => setActiveTab("water")}
            className={`flex items-center gap-2 px-8 py-3 rounded-full transition-all duration-300 ${
              activeTab === "water" 
                ? "bg-[#A172FD] text-white shadow-md scale-105" 
                : "text-[#6B7280] hover:text-[#A172FD]"
            }`}
          >
            <span className="text-base">💧</span>
            Nhắc lịch Uống nước
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="transition-all duration-300">
        {activeTab === "meal" ? (
          <div className="space-y-4 bg-white/60 p-8 rounded-[32px] border border-white/40 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
              <span className="text-2xl">🍽️</span>
              <h2 className="text-xl font-bold text-gray-800">Nhật ký Ăn uống & Dinh dưỡng</h2>
            </div>
            <MealManagementTab />
          </div>
        ) : (
          <div className="space-y-4 bg-white/60 p-8 rounded-[32px] border border-white/40 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
              <span className="text-2xl">💧</span>
              <h2 className="text-xl font-bold text-gray-800">Nhắc lịch & Theo dõi Nước uống</h2>
            </div>
            <WaterReminderTab />
          </div>
        )}
      </div>

      {activeTab === "meal" ? (
        <OnboardingTour pageKey="nutrition-meal" steps={mealTourSteps} />
      ) : (
        <OnboardingTour pageKey="nutrition-water" steps={waterTourSteps} />
      )}
    </div>
  );
}

export default function NutritionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Đang tải...</div>}>
      <NutritionTabsContent />
    </Suspense>
  );
}
