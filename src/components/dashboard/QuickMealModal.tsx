"use client";

import { motion } from "framer-motion";
import { X, Utensils } from "lucide-react";
import { ModalPortal } from "@/components/ModalPortal";

interface MealFormData {
  name: string;
  category: string;
  time: string;
  grams: string;
  calories: string;
}

interface QuickMealModalProps {
  showAddMeal: boolean;
  setShowAddMeal: (val: boolean) => void;
  mealForm: MealFormData;
  setMealForm: (val: MealFormData) => void;
  handleSaveMeal: () => void;
  isSubmitting: boolean;
}

export function QuickMealModal({
  showAddMeal,
  setShowAddMeal,
  mealForm,
  setMealForm,
  handleSaveMeal,
  isSubmitting,
}: QuickMealModalProps) {
  if (!showAddMeal) return null;

  return (
    <ModalPortal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[250] flex items-center justify-center bg-black/40 backdrop-blur-md p-3 sm:p-4 overscroll-contain"
        onClick={() => setShowAddMeal(false)}
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          className="relative flex min-h-[440px] max-h-[85dvh] w-full max-w-[480px] sm:h-[500px] sm:w-[500px] rounded-[36px] sm:rounded-full items-center justify-center bg-white shadow-2xl ring-8 ring-[#F5F3FF] overflow-y-auto overscroll-contain scrollbar-thin p-6 sm:p-10"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Close button X */}
        <button
          onClick={() => setShowAddMeal(false)}
          className="absolute top-8 right-8 p-1.5 rounded-xl bg-black/5 hover:bg-black/10 text-gray-700 hover:text-red-500 transition-colors z-10"
          aria-label="Đóng thêm bữa ăn"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="w-full max-sm text-center px-10">
          <Utensils className="mx-auto mb-4 h-12 w-12 text-[#A172FD]" />
          <h2 className="mb-6 text-3xl font-bold text-[#A172FD]">Măm măm gì nè?</h2>
          <div className="space-y-6">
            <input
              type="text"
              placeholder="Tên món ăn..."
              value={mealForm.name}
              onChange={(e) => setMealForm({ ...mealForm, name: e.target.value })}
              className="w-full bg-transparent border-b-2 border-[#F0ECFF] py-2 text-center text-xl text-gray-950 placeholder:text-gray-400 font-bold outline-none"
            />
            <div className="flex justify-center gap-2">
              {["Sáng", "Trưa", "Tối", "Vặt"].map(b => (
                <button
                  key={b}
                  type="button"
                  onClick={() => {
                    let t = "07:00";
                    if (b === "Trưa") t = "12:00";
                    else if (b === "Tối") t = "18:00";
                    else if (b === "Vặt") t = "15:00";
                    setMealForm({ ...mealForm, category: b, time: t });
                  }}
                  className={`rounded-full px-4 py-1 text-xs font-medium transition-colors ${mealForm.category === b ? "bg-[#A172FD] text-white font-bold" : "bg-[#F5F3FF] text-[#A172FD] hover:bg-[#F0ECFF] font-semibold"}`}
                >
                  {b}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase">Giờ ăn:</span>
              <input
                type="time"
                value={mealForm.time}
                onChange={(e) => setMealForm({ ...mealForm, time: e.target.value })}
                className="bg-transparent border-b border-[#F0ECFF] text-center text-sm font-bold text-gray-950 outline-none w-28"
              />
            </div>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Khối lượng (g) (Tùy chọn)"
                value={mealForm.grams}
                onChange={(e) => setMealForm({ ...mealForm, grams: e.target.value })}
                className="w-1/2 bg-transparent border-b-2 border-[#F0ECFF] py-2 text-center text-gray-950 placeholder:text-gray-400 font-bold outline-none"
              />
              <input
                type="number"
                placeholder="Calo (Tùy chọn)"
                value={mealForm.calories}
                onChange={(e) => setMealForm({ ...mealForm, calories: e.target.value })}
                className="w-1/2 bg-transparent border-b-2 border-[#F0ECFF] py-2 text-center text-gray-950 placeholder:text-gray-400 font-bold outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveMeal}
              disabled={isSubmitting}
              className={`mt-4 block w-full max-w-[240px] mx-auto rounded-full bg-[#A172FD] py-2 text-sm font-bold text-white shadow-lg shadow-[#A172FD]/30 transition-all ${
                isSubmitting ? "opacity-60 cursor-not-allowed" : "hover:scale-105 active:scale-95"
              }`}
            >
              {isSubmitting ? "Đang thêm..." : "Thêm vào thực đơn"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
    </ModalPortal>
  );
}
