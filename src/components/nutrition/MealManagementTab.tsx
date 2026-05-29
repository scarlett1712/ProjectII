"use client";

import { useState, useEffect } from "react";
import { 
  format, 
  addDays, 
  subDays, 
  isSameDay, 
  parseISO, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  setHours,
  setMinutes
} from "date-fns";
import { vi } from "date-fns/locale";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer 
} from "recharts";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Pencil,
  Clock, 
  X, 
  Utensils, 
  Calendar,
  AlertCircle,
  Bell
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Meal = { id: string; mealName: string; calories: number; grams: number; eatenAt: string; note?: string | null };

export function MealManagementTab() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeView, setActiveView] = useState<"list" | "month" | "week" | "day">("list");
  const [hiddenHours, setHiddenHours] = useState<number[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [hourMenu, setHourMenu] = useState<{ hour: number; x: number; y: number } | null>(null);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [selectedMealForDetails, setSelectedMealForDetails] = useState<Meal | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [mealName, setMealName] = useState("");
  const [grams, setGrams] = useState<number | "">("");
  const [calories, setCalories] = useState<number | "">("");
  const [category, setCategory] = useState("Sáng");
  const [mealTime, setMealTime] = useState("07:00");
  const [clickedHour, setClickedHour] = useState<number | null>(null);

  const selectCategory = (cat: string) => {
    setCategory(cat);
    if (cat === "Sáng") setMealTime("07:00");
    else if (cat === "Trưa") setMealTime("12:00");
    else if (cat === "Tối") setMealTime("18:00");
    else if (cat === "Vặt") setMealTime("15:00");
  };

  const getRealTimeMealDefaults = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    let cat = "Vặt";
    if (hours >= 5 && hours < 11) cat = "Sáng";
    else if (hours >= 11 && hours < 15) cat = "Trưa";
    else if (hours >= 17 && hours < 23) cat = "Tối";
    return { time: timeStr, category: cat };
  };
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      show: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(null);
      }
    });
  };

  async function loadMeals() {
    try {
      const res = await fetch("/api/meals");
      const data = await res.json();
      setMeals(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadProfile() {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadMeals();
    loadProfile();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("nutrition-hidden-hours");
    if (stored) {
      try {
        setHiddenHours(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem("nutrition-hidden-hours", JSON.stringify(hiddenHours));
  }, [hiddenHours, isMounted]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mealName.trim()) return;
    
    // Create eatenAt based on selected date and entered/selected time
    const eatenAt = new Date(selectedDate);
    const [h, m] = mealTime.split(":");
    eatenAt.setHours(Number(h), Number(m), 0, 0);

    try {
      const url = "/api/meals";
      const method = editingMeal ? "PATCH" : "POST";
      const bodyPayload: any = {
        mealName: mealName.trim(), 
        grams: grams === "" ? 0 : Number(grams), 
        calories: calories === "" ? 0 : Number(calories), 
        note: category, 
        eatenAt: eatenAt.toISOString() 
      };
      if (editingMeal) {
        bodyPayload.id = editingMeal.id;
      }

      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      setMealName("");
      setGrams("");
      setCalories("");
      setCategory("Sáng");
      setClickedHour(null);
      setEditingMeal(null);
      setShowAddModal(false);
      showToast(editingMeal ? "Đã cập nhật bữa ăn!" : "Đã lưu bữa ăn mới!");
      loadMeals();
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteMeal(id: string) {
    showConfirm(
      "Xóa bữa ăn",
      "Bạn có chắc chắn muốn xóa bữa ăn này không?",
      async () => {
        try {
          const res = await fetch(`/api/meals?id=${id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            setSelectedMealForDetails(null);
            showToast("Đã xóa bữa ăn thành công!");
            loadMeals();
          }
        } catch (e) {
          console.error(e);
          showToast("Lỗi khi xóa bữa ăn.");
        }
      }
    );
  }

  // Categories helper
  const categoryConfig: Record<string, { label: string; emoji: string; bg: string; border: string; text: string }> = {
    "Sáng": { label: "Ăn sáng", emoji: "🍳", bg: "bg-[#FEF3C7] text-[#D97706]", border: "#D97706", text: "#D97706" },
    "Trưa": { label: "Ăn trưa", emoji: "🍛", bg: "bg-[#D1FAE5] text-[#059669]", border: "#059669", text: "#059669" },
    "Tối": { label: "Ăn tối", emoji: "🍲", bg: "bg-[#DBEAFE] text-[#2563EB]", border: "#2563EB", text: "#2563EB" },
    "Vặt": { label: "Ăn vặt", emoji: "🍎", bg: "bg-[#F3E8FF] text-[#7C3AED]", border: "#7C3AED", text: "#7C3AED" },
  };

  const getCategoryDetails = (note?: string | null) => {
    const key = note || "Vặt";
    return categoryConfig[key] || { label: note || "Khác", emoji: "🍲", bg: "bg-gray-100 text-gray-600", border: "#6B7280", text: "#374151" };
  };

  // Generate week days for calendar week selector
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const selectedDayMeals = meals.filter(m => isSameDay(parseISO(m.eatenAt), selectedDate));
  const selectedDayTotal = selectedDayMeals.reduce((acc, m) => acc + m.calories, 0);
  const targetCalories = profile?.dailyCalories || 2000;
  const progressPercent = Math.min(100, Math.round((selectedDayTotal / targetCalories) * 100));

  // Prepare chart data (last 7 days)
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayMeals = meals.filter(m => isSameDay(parseISO(m.eatenAt), d));
    const total = dayMeals.reduce((acc, m) => acc + m.calories, 0);
    chartData.push({
      name: format(d, "dd/MM"),
      calories: total,
    });
  }

  // Calendar coordinates calculation
  const startRange = startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 });
  const endRange = endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 });
  const daysInMonth = eachDayOfInterval({ start: startRange, end: endRange });

  const getMealAbsoluteTop = (eatenAtIso: string) => {
    const d = new Date(eatenAtIso);
    const hours = d.getHours() + d.getMinutes() / 60;
    const hiddenBefore = hiddenHours.filter(h => h < hours).length;
    const adjustedHours = hours - hiddenBefore;
    return adjustedHours * 50;
  };

  const getMealVisibility = (eatenAtIso: string) => {
    const d = new Date(eatenAtIso);
    const hour = d.getHours();
    return !hiddenHours.includes(hour);
  };

  const handleMonthDayClick = (day: Date) => {
    setSelectedDate(day);
    setActiveView("day");
  };

  const openAddMealAtTime = (date: Date, hour: number) => {
    setSelectedDate(date);
    setClickedHour(hour);
    setMealName("");
    setGrams("");
    setCalories("");
    const cat = hour < 11 ? "Sáng" : hour < 15 ? "Trưa" : hour < 20 ? "Tối" : "Vặt";
    setCategory(cat);
    setMealTime(`${String(hour).padStart(2, "0")}:00`);
    setShowAddModal(true);
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-bold">Đang tải dữ liệu...</div>;

  return (
    <div className="space-y-6 relative">
      
      {/* Top Header Selector: List vs Month vs Week vs Day */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-100 pb-4 mb-4">
        <h3 className="text-lg font-bold text-[#581C87]">Nhật ký Dinh dưỡng của bạn</h3>
        <div id="tour-meal-views" className="flex rounded-full bg-[#F5F3FF] p-1 text-xs font-bold shadow-inner border border-purple-100/50">
          {([
            { id: "list", label: "Danh sách & Thống kê" },
            { id: "month", label: "Tháng" },
            { id: "week", label: "Tuần" },
            { id: "day", label: "Ngày" },
          ] as const).map(v => (
            <button 
              key={v.id} 
              onClick={() => setActiveView(v.id)} 
              className={`px-4 py-2 rounded-full transition-all duration-300 ${activeView === v.id ? "bg-[#A172FD] text-white shadow-sm font-black scale-105" : "text-[#6B7280] hover:text-[#A172FD] font-semibold"}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* LIST VIEW (Original layout) */}
      {activeView === "list" && (
        <div className="space-y-6">
          {/* Top Row: Week calendar picker & Progress card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Week Selector */}
            <div id="tour-meal-week-picker" className="lg:col-span-2 bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 capitalize">
                  Tháng {format(selectedDate, "MM/yyyy", { locale: vi })}
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedDate(subDays(selectedDate, 7))} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map(day => {
                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());
                  const hasMeals = meals.some(m => isSameDay(parseISO(m.eatenAt), day));
                  
                  return (
                    <button 
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`flex flex-col items-center p-3 rounded-2xl transition-all ${
                        isSelected ? "bg-[#A172FD] text-white shadow-md scale-105" : 
                        isToday ? "bg-[#F5F3FF] text-[#A172FD]" : "hover:bg-gray-50 text-gray-600"
                      }`}
                    >
                      <span className={`text-[10px] mb-1 ${isSelected ? "text-purple-100" : "text-gray-400"}`}>
                        {format(day, "E", { locale: vi })}
                      </span>
                      <span className="font-bold text-base">{format(day, "d")}</span>
                      {hasMeals && !isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#A172FD] mt-1"></div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Daily Calorie Goal Progress Card */}
            <div id="tour-meal-progress" className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
              <h3 className="text-gray-500 text-sm font-bold text-center">Calo ngày {format(selectedDate, "dd/MM")}</h3>
              <div className="flex items-center justify-center gap-6 my-4">
                <div className="relative flex h-24 w-24 items-center justify-center">
                  <svg className="h-full w-full -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="#F5F3FF" strokeWidth="8" fill="transparent" />
                    <circle 
                      cx="48" 
                      cy="48" 
                      r="40" 
                      stroke="#A172FD" 
                      strokeWidth="8" 
                      fill="transparent" 
                      strokeDasharray={251} 
                      strokeDashoffset={251 - (251 * progressPercent) / 100} 
                      strokeLinecap="round" 
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-base font-black text-[#581C87]">{progressPercent}%</span>
                  </div>
                </div>
                <div className="text-left space-y-1">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Đã nạp</p>
                    <p className="text-xl font-extrabold text-gray-800">{selectedDayTotal} <span className="text-xs text-gray-400 font-normal">kcal</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Mục tiêu</p>
                    <p className="text-sm font-bold text-[#A172FD]">{targetCalories} <span className="text-xs text-[#A172FD]/70 font-normal">kcal</span></p>
                  </div>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-[#A172FD] h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>
          </div>

          {/* Meals List & Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">
                  Thực đơn ngày {format(selectedDate, "dd/MM")}
                </h3>
                <button 
                  id="tour-meal-add-btn"
                  onClick={() => { 
                    setClickedHour(null); 
                    setMealName("");
                    setGrams("");
                    setCalories("");
                    setEditingMeal(null);
                    const defaults = getRealTimeMealDefaults();
                    setCategory(defaults.category); 
                    setMealTime(defaults.time); 
                    setShowAddModal(true); 
                  }}
                  className="flex items-center gap-1 bg-[#A172FD] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#8b5cf6] transition-colors shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Thêm bữa
                </button>
              </div>

              <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
                <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
                  <span className="text-gray-500 font-bold">Tổng năng lượng nạp vào:</span>
                  <span className="text-2xl font-black text-[#A172FD]">{selectedDayTotal} <span className="text-base text-gray-400 font-normal">kcal</span></span>
                </div>

                {selectedDayMeals.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 flex flex-col items-center">
                    <Utensils className="h-12 w-12 mb-3 text-gray-200" />
                    <p className="text-sm font-medium">Chưa có bữa ăn nào được ghi lại cho ngày này</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDayMeals.map(meal => {
                      const cat = getCategoryDetails(meal.note);
                      return (
                        <div 
                          key={meal.id} 
                          onClick={() => setSelectedMealForDetails(meal)}
                          className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-[#f0ecff]/50 transition-colors border border-transparent hover:border-[#e9d5ff] cursor-pointer group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-xl select-none">
                              {cat.emoji}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-gray-800">{meal.mealName}</h4>
                                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold select-none ${cat.bg}`}>
                                  {cat.label}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 mt-0.5">{meal.grams > 0 ? `${meal.grams}g` : "Tùy chọn"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-bold text-gray-800">{meal.calories > 0 ? `${meal.calories} kcal` : "Tùy chọn"}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{format(parseISO(meal.eatenAt), "HH:mm")}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const catName = meal.note || "Sáng";
                                  setEditingMeal(meal);
                                  setMealName(meal.mealName);
                                  setGrams(meal.grams > 0 ? meal.grams : "");
                                  setCalories(meal.calories > 0 ? meal.calories : "");
                                  setCategory(catName);
                                  
                                  const eatenDate = parseISO(meal.eatenAt);
                                  const h = String(eatenDate.getHours()).padStart(2, "0");
                                  const m = String(eatenDate.getMinutes()).padStart(2, "0");
                                  setMealTime(`${h}:${m}`);
                                  
                                  setShowAddModal(true);
                                }}
                                className="p-2 rounded-xl text-gray-400 hover:text-[#A172FD] hover:bg-[#F5F3FF] transition-all active:scale-95"
                                title="Sửa bữa ăn"
                              >
                                <Pencil className="h-5 w-5" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteMeal(meal.id);
                                }}
                                className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-95"
                                title="Xóa bữa ăn"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Charts (last 7 days) */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
                <h3 className="text-gray-800 font-semibold mb-4 text-sm">Biểu đồ Calo (7 ngày qua)</h3>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorCal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#A172FD" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#A172FD" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                      <ChartTooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area type="monotone" dataKey="calories" stroke="#A172FD" strokeWidth={3} fillOpacity={1} fill="url(#colorCal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MONTH VIEW CALENDAR */}
      {activeView === "month" && (
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 space-y-6">
          {/* Calendar Month Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-50">
            <h2 className="text-xl font-bold text-gray-800 capitalize flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#A172FD]" />
              Tháng {format(selectedDate, "MM / yyyy", { locale: vi })}
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setSelectedDate(subMonths(selectedDate, 1))} 
                className="p-2 rounded-full hover:bg-purple-100/50 text-[#A172FD] transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button 
                onClick={() => setSelectedDate(new Date())} 
                className="px-4 py-1.5 rounded-full bg-[#F5F3FF] text-[#A172FD] font-bold text-xs hover:bg-[#A172FD] hover:text-white transition-colors"
              >
                Hôm nay
              </button>
              <button 
                onClick={() => setSelectedDate(addMonths(selectedDate, 1))} 
                className="p-2 rounded-full hover:bg-purple-100/50 text-[#A172FD] transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-7 gap-1">
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(d => (
              <div key={d} className="text-center font-bold text-xs text-gray-400 py-2 uppercase">{d}</div>
            ))}
            
            {daysInMonth.map((day, i) => {
              const dayMeals = meals.filter(m => isSameDay(parseISO(m.eatenAt), day));
              const isCurrentMonth = isSameMonth(day, selectedDate);
              const isToday = isSameDay(day, new Date());

              return (
                <div 
                  key={i} 
                  onClick={() => handleMonthDayClick(day)}
                  className={`min-h-[110px] border border-gray-50 p-2 rounded-2xl flex flex-col justify-between transition-colors cursor-pointer group ${
                    isCurrentMonth ? "bg-white" : "bg-gray-50/50 opacity-40"
                  } ${isToday ? "ring-2 ring-[#A172FD]/20 bg-purple-50/20" : "hover:bg-purple-50/10"}`}
                >
                  <span className={`text-xs font-black self-end px-2 py-0.5 rounded-full ${
                    isToday ? "bg-[#A172FD] text-white" : "text-gray-600"
                  }`}>
                    {format(day, "d")}
                  </span>

                  <div className="space-y-1 mt-2 flex-1 overflow-y-auto max-h-[80px] scrollbar-thin">
                    {dayMeals.map(meal => {
                      const cat = getCategoryDetails(meal.note);
                      return (
                        <div 
                          key={meal.id}
                          onClick={(e) => { e.stopPropagation(); setSelectedMealForDetails(meal); }}
                          className={`text-[9px] font-bold p-1 rounded-lg truncate flex items-center gap-1 ${cat.bg} hover:brightness-95`}
                        >
                          <span>{cat.emoji}</span>
                          <span className="truncate flex-1">{meal.mealName}</span>
                          {meal.calories > 0 && <span className="opacity-80">{meal.calories}k</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK & DAY VIEWS */}
      {(activeView === "week" || activeView === "day") && (
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex flex-col">
          {/* Calendar Navigation */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
            <h2 className="text-xl font-bold text-gray-800 capitalize flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#A172FD]" />
              {activeView === "week" 
                ? `Tuần tháng ${format(selectedDate, "MM / yyyy", { locale: vi })}`
                : `Ngày ${format(selectedDate, "dd / MM / yyyy", { locale: vi })}`
              }
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setSelectedDate(prev => activeView === "week" ? subWeeks(prev, 1) : subDays(prev, 1))} 
                className="p-2 rounded-full hover:bg-purple-100/50 text-[#A172FD] transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button 
                onClick={() => setSelectedDate(new Date())} 
                className="px-4 py-1.5 rounded-full bg-[#F5F3FF] text-[#A172FD] font-bold text-xs hover:bg-[#A172FD] hover:text-white transition-colors"
              >
                Hôm nay
              </button>
              <button 
                onClick={() => setSelectedDate(prev => activeView === "week" ? addWeeks(prev, 1) : addDays(prev, 1))} 
                className="p-2 rounded-full hover:bg-purple-100/50 text-[#A172FD] transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Hour Grid Layout */}
          <div className="overflow-x-auto">
            <div className="min-w-[600px] flex flex-col">
              {/* Columns Header */}
              <div className="grid grid-cols-8 border-b border-gray-100 py-3">
                <div 
                  onClick={() => {
                    if (hiddenHours.length > 0) {
                      setHiddenHours([]);
                      showToast("Đã hiện lại tất cả các hàng.");
                    }
                  }}
                  className={`col-span-1 text-center text-xs font-bold text-gray-400 ${hiddenHours.length > 0 ? "cursor-pointer text-[#A172FD] underline" : ""}`}
                >
                  {hiddenHours.length > 0 ? `Hiện (${hiddenHours.length})` : "Giờ"}
                </div>
                {activeView === "week" ? weekDays.map((day, i) => (
                  <div key={i} className="col-span-1 text-center flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{format(day, "E", { locale: vi })}</span>
                    <span className={`text-base font-black px-2.5 py-0.5 rounded-full mt-0.5 ${
                      isSameDay(day, new Date()) ? "bg-[#A172FD] text-white" : "text-gray-700"
                    }`}>{format(day, "d")}</span>
                  </div>
                )) : (
                  <div className="col-span-7 text-center flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{format(selectedDate, "EEEE", { locale: vi })}</span>
                    <span className="text-base font-black px-2.5 py-0.5 bg-[#A172FD] text-white rounded-full mt-0.5">{format(selectedDate, "d")}</span>
                  </div>
                )}
              </div>

              {/* Grid Body */}
              <div className="max-h-[500px] overflow-y-auto relative scrollbar-thin">
                <div className="grid grid-cols-8 relative">
                  
                  {/* Hours column */}
                  <div className="col-span-1 border-r border-gray-50 flex flex-col select-none">
                    {Array.from({ length: 24 }).map((_, hour) => {
                      if (hiddenHours.includes(hour)) return null;
                      return (
                        <div 
                          key={hour} 
                          onClick={(e) => {
                            e.preventDefault();
                            setHourMenu({ hour, x: e.clientX, y: e.clientY });
                          }}
                          className="h-[50px] border-b border-gray-50 flex items-center justify-center text-[10px] font-bold text-gray-400 cursor-pointer hover:bg-gray-50 transition-colors"
                          title="Nhấn để ẩn hàng"
                        >
                          {`${String(hour).padStart(2, "0")}:00`}
                        </div>
                      );
                    })}
                  </div>

                  {/* Day column grids */}
                  {activeView === "week" ? (
                    weekDays.map((day, i) => {
                      const isToday = isSameDay(day, new Date());
                      const dayMeals = meals.filter(m => isSameDay(parseISO(m.eatenAt), day));
                      const columnHeight = (24 - hiddenHours.length) * 50;

                      return (
                        <div key={i} style={{ height: `${columnHeight}px` }} className={`col-span-1 relative border-r border-gray-50 ${isToday ? "bg-purple-50/5" : ""}`}>
                          {Array.from({ length: 24 }).map((_, hour) => {
                            if (hiddenHours.includes(hour)) return null;
                            return (
                              <div
                                key={hour}
                                onClick={() => openAddMealAtTime(day, hour)}
                                className="h-[50px] border-b border-gray-50 hover:bg-purple-50/10 cursor-crosshair transition-colors"
                                title="Nhấp để thêm bữa ăn tại đây"
                              />
                            );
                          })}

                          {/* Meal absolute items */}
                          {dayMeals.filter(m => getMealVisibility(m.eatenAt)).map(meal => {
                            const cat = getCategoryDetails(meal.note);
                            const top = getMealAbsoluteTop(meal.eatenAt);
                            
                            return (
                              <div
                                key={meal.id}
                                onClick={(e) => { e.stopPropagation(); setSelectedMealForDetails(meal); }}
                                style={{ 
                                  top, 
                                  height: 46,
                                  backgroundColor: cat.bg.split(' ')[0] === 'bg-[#FEF3C7]' ? '#FEF3C7' : 
                                                   cat.bg.split(' ')[0] === 'bg-[#D1FAE5]' ? '#D1FAE5' : 
                                                   cat.bg.split(' ')[0] === 'bg-[#DBEAFE]' ? '#DBEAFE' : '#F3E8FF',
                                  borderLeft: `4px solid ${cat.border}`,
                                  border: `1px solid ${cat.border}40`,
                                  borderLeftColor: cat.border,
                                  zIndex: 10
                                }}
                                className="absolute left-0.5 right-0.5 p-1 rounded-r-lg shadow-sm cursor-pointer hover:brightness-95 flex flex-col justify-between overflow-hidden select-none"
                              >
                                <span className="text-[9px] font-black text-gray-800 truncate leading-tight">
                                  {cat.emoji} {meal.mealName}
                                </span>
                                <div className="flex items-center justify-between text-[8px] opacity-75 font-bold">
                                  <span>{format(parseISO(meal.eatenAt), "HH:mm")}</span>
                                  {meal.calories > 0 && <span>{meal.calories} kcal</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  ) : (
                    /* Day view single column */
                    <div style={{ height: `${(24 - hiddenHours.length) * 50}px` }} className="col-span-7 relative">
                      {Array.from({ length: 24 }).map((_, hour) => {
                        if (hiddenHours.includes(hour)) return null;
                        return (
                          <div
                            key={hour}
                            onClick={() => openAddMealAtTime(selectedDate, hour)}
                            className="h-[50px] border-b border-gray-50 hover:bg-purple-50/10 cursor-crosshair transition-colors"
                            title="Nhấp để thêm bữa ăn tại đây"
                          />
                        );
                      })}

                      {meals.filter(m => isSameDay(parseISO(m.eatenAt), selectedDate)).filter(m => getMealVisibility(m.eatenAt)).map(meal => {
                        const cat = getCategoryDetails(meal.note);
                        const top = getMealAbsoluteTop(meal.eatenAt);
                        
                        return (
                          <div
                            key={meal.id}
                            onClick={(e) => { e.stopPropagation(); setSelectedMealForDetails(meal); }}
                            style={{ 
                              top, 
                              height: 46,
                              backgroundColor: cat.bg.split(' ')[0] === 'bg-[#FEF3C7]' ? '#FEF3C7' : 
                                               cat.bg.split(' ')[0] === 'bg-[#D1FAE5]' ? '#D1FAE5' : 
                                               cat.bg.split(' ')[0] === 'bg-[#DBEAFE]' ? '#DBEAFE' : '#F3E8FF',
                              borderLeft: `4px solid ${cat.border}`,
                              border: `1px solid ${cat.border}40`,
                              borderLeftColor: cat.border,
                              zIndex: 10
                            }}
                            className="absolute left-2 right-2 p-1.5 rounded-r-lg shadow-sm cursor-pointer hover:brightness-95 flex flex-col justify-between overflow-hidden select-none"
                          >
                            <span className="text-xs font-black text-gray-800 truncate">
                              {cat.emoji} {meal.mealName} {meal.grams > 0 ? `(${meal.grams}g)` : ""}
                            </span>
                            <div className="flex items-center justify-between text-[10px] opacity-75 font-bold">
                              <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {format(parseISO(meal.eatenAt), "HH:mm")}</span>
                              {meal.calories > 0 ? <span>{meal.calories} kcal</span> : <span>Tùy chọn</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {selectedMealForDetails && (
          <div 
            onClick={() => setSelectedMealForDetails(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-[360px] rounded-[28px] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#581C87]">Chi tiết bữa ăn</h3>
                <button 
                  onClick={() => setSelectedMealForDetails(null)}
                  className="p-1 rounded-full hover:bg-gray-100 text-gray-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {(() => {
                const cat = getCategoryDetails(selectedMealForDetails.note);
                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                      <span className="text-3xl">{cat.emoji}</span>
                      <div>
                        <h4 className="font-extrabold text-gray-900 text-base">{selectedMealForDetails.mealName}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block mt-0.5 ${cat.bg}`}>
                          {cat.label}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="bg-[#F5F3FF] p-3 rounded-xl border border-purple-50">
                        <span className="text-xs font-bold text-gray-500 block uppercase">Khối lượng</span>
                        <span className="text-base font-black text-[#A172FD] mt-1 block">{selectedMealForDetails.grams > 0 ? `${selectedMealForDetails.grams}g` : "Tùy chọn"}</span>
                      </div>
                      <div className="bg-[#F5F3FF] p-3 rounded-xl border border-purple-50">
                        <span className="text-xs font-bold text-gray-500 block uppercase">Năng lượng</span>
                        <span className="text-base font-black text-[#A172FD] mt-1 block">{selectedMealForDetails.calories > 0 ? `${selectedMealForDetails.calories} kcal` : "Tùy chọn"}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs font-bold text-gray-500 px-1 py-2 border-y border-gray-100">
                      <span>Thời điểm ăn</span>
                      <span className="text-gray-800">{format(parseISO(selectedMealForDetails.eatenAt), "dd/MM/yyyy - HH:mm")}</span>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button 
                        type="button" 
                        onClick={() => setSelectedMealForDetails(null)}
                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-all"
                      >
                        Đóng
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          const meal = selectedMealForDetails;
                          setEditingMeal(meal);
                          setMealName(meal.mealName);
                          setGrams(meal.grams > 0 ? meal.grams : "");
                          setCalories(meal.calories > 0 ? meal.calories : "");
                          setCategory(meal.note || "Sáng");
                          
                          const eatenDate = parseISO(meal.eatenAt);
                          const h = String(eatenDate.getHours()).padStart(2, "0");
                          const m = String(eatenDate.getMinutes()).padStart(2, "0");
                          setMealTime(`${h}:${m}`);
                          
                          setSelectedMealForDetails(null);
                          setShowAddModal(true);
                        }}
                        className="py-3 px-4 bg-purple-50 hover:bg-purple-100 text-[#A172FD] font-bold rounded-xl text-sm transition-all flex items-center gap-1.5 justify-center"
                        title="Sửa bữa ăn"
                      >
                        Sửa
                      </button>
                      <button 
                        type="button" 
                        onClick={() => deleteMeal(selectedMealForDetails.id)}
                        className="py-3 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-sm transition-all flex items-center gap-1.5 justify-center"
                        title="Xóa bữa ăn"
                      >
                        <Trash2 className="h-4 w-4" />
                        Xóa
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Meal Modal */}
      {showAddModal && (
         <motion.div 
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-md"
           onClick={() => { setShowAddModal(false); setClickedHour(null); setEditingMeal(null); }}
         >
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", damping: 20, stiffness: 100 }}
              className="relative flex h-[500px] w-[500px] items-center justify-center rounded-full bg-white shadow-2xl ring-8 ring-[#F5F3FF]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button X */}
              <button 
                onClick={() => { setShowAddModal(false); setClickedHour(null); setEditingMeal(null); }}
                className="absolute top-8 right-8 p-1.5 rounded-xl bg-black/5 hover:bg-black/10 text-gray-700 hover:text-red-500 transition-colors z-10"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="w-full max-sm text-center px-10">
                <Utensils className="mx-auto mb-4 h-12 w-12 text-[#A172FD]" />
                <h2 className="mb-6 text-3xl font-bold text-[#A172FD]">{editingMeal ? "Sửa bữa ăn" : "Măm măm gì nè?"}</h2>
                <form onSubmit={onSubmit} className="space-y-6">
                  <input 
                    required
                    type="text" 
                    placeholder="Tên món ăn..." 
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
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
                           setCategory(b);
                           setMealTime(t);
                         }}
                         className={`rounded-full px-4 py-1 text-xs font-medium transition-colors ${category === b ? "bg-[#A172FD] text-white font-bold" : "bg-[#F5F3FF] text-[#A172FD] hover:bg-[#F0ECFF] font-semibold"}`}
                       >
                         {b}
                       </button>
                     ))}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">Giờ ăn:</span>
                    <input 
                      type="time" 
                      value={mealTime}
                      onChange={(e) => setMealTime(e.target.value)}
                      className="bg-transparent border-b border-[#F0ECFF] text-center text-sm font-bold text-gray-950 outline-none w-28"
                    />
                  </div>
                  <div className="flex gap-4">
                    <input 
                      type="text" 
                      placeholder="Khối lượng (g) (Tùy chọn)" 
                      value={grams}
                      onChange={(e) => setGrams(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-1/2 bg-transparent border-b-2 border-[#F0ECFF] py-2 text-center text-gray-950 placeholder:text-gray-400 font-bold outline-none" 
                    />
                    <input 
                      type="text" 
                      placeholder="Calo (Tùy chọn)" 
                      value={calories}
                      onChange={(e) => setCalories(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-1/2 bg-transparent border-b-2 border-[#F0ECFF] py-2 text-center text-gray-950 placeholder:text-gray-400 font-bold outline-none" 
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full max-w-[240px] mx-auto block rounded-full bg-[#A172FD] py-2 text-sm font-bold text-white hover:bg-[#8b5cf6] transition-colors shadow-md mt-4"
                  >
                    {editingMeal ? "Lưu thay đổi" : "Thêm vào thực đơn"}
                  </button>
                </form>
              </div>
            </motion.div>
         </motion.div>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 rounded-2xl bg-white/85 border border-purple-100 p-4 shadow-2xl backdrop-blur-md"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-[#A172FD]">
              <Bell className="h-5 w-5 animate-bounce" />
            </div>
            <p className="text-sm font-bold text-gray-800">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmDialog && (
          <div 
            onClick={() => setConfirmDialog(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-[360px] rounded-[28px] p-6 shadow-2xl border border-gray-100"
            >
              <div className="flex items-center gap-2 mb-4 text-[#A172FD]">
                <AlertCircle className="h-6 w-6 animate-pulse" />
                <h3 className="text-lg font-bold">Xác nhận</h3>
              </div>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed font-semibold">{confirmDialog.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 rounded-xl border border-gray-200 py-3 font-bold text-gray-500 hover:bg-gray-50 transition-colors text-sm"
                >
                  Đóng
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 py-3 font-bold text-white transition-colors shadow-md text-sm"
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HOUR ROW CONTEXT MENU FOR HIDING */}
      {hourMenu && (
        <>
          <div className="fixed inset-0 z-[199]" onClick={() => setHourMenu(null)} />
          <div 
            className="fixed z-[200] bg-white border border-gray-100 rounded-2xl shadow-xl p-2 w-40"
            style={{ left: hourMenu.x, top: hourMenu.y }}
          >
            <button
              onClick={() => {
                setHiddenHours(prev => [...prev, hourMenu.hour]);
                setHourMenu(null);
                showToast(`Đã ẩn hàng lúc ${String(hourMenu.hour).padStart(2, "0")}:00.`);
              }}
              className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-1.5"
            >
              Ẩn hàng này
            </button>
            {hiddenHours.length > 0 && (
              <button
                onClick={() => {
                  setHiddenHours([]);
                  setHourMenu(null);
                  showToast("Đã hiện lại tất cả các hàng.");
                }}
                className="w-full text-left px-3 py-2 text-xs font-bold text-purple-600 hover:bg-purple-50 rounded-xl transition-colors flex items-center gap-1.5 border-t border-gray-50 mt-1 pt-2"
              >
                Hiện tất cả hàng
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
