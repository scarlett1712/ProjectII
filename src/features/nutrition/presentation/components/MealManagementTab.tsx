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
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
} from "date-fns";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer 
} from "recharts";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Pencil,
  Utensils, 
  Calendar,
} from "lucide-react";
import { fetchWithCache, notifyDataChanged } from "@/shared/client/cacheSync";
import { apiErrorMessage, apiRequest } from "@/shared/client/api";
import { colors } from "@/shared/theme/tokens";
import { useTranslations } from "next-intl";
import { formatDate } from "@/shared/i18n/format";
import { MEAL_CATEGORIES, defaultMealTime, mealCategoryForHour } from "@/features/nutrition/domain/mealCategories";
import { TOAST_DURATION, Button, IconButton, SegmentedControl, useConfirm, useToast } from "@/shared/ui/components";
import { MealDetailsModal } from "./MealDetailsModal";
import { MealFormModal } from "./MealFormModal";
import type { Meal, MealCategoryDetails } from "./mealTypes";
import { API_ROUTES, withQuery } from "@/shared/config/routes";
import { useDataSync } from "@/shared/client/hooks";
import { HOUR_ROW_PX, dayColumnHeight, visibleHours } from "@/features/calendar/presentation/timeGrid";
import { useHiddenHours } from "@/features/calendar/presentation/components/useHiddenHours";
import { MonthGrid } from "@/features/calendar/presentation/components/MonthGrid";
import { TimeGridHeader } from "@/features/calendar/presentation/components/TimeGridHeader";
import { HourLabels } from "@/features/calendar/presentation/components/HourLabels";
import { HourContextMenu } from "@/features/calendar/presentation/components/HourContextMenu";
import { MealTimeCard } from "./MealTimeCard";
import { emitStarNotification } from "@/shared/client/appEvents";
import { STORAGE_KEYS } from "@/shared/client/storageKeys";
import { DEFAULT_DAILY_CALORIES } from "@/shared/domain/healthDefaults";

const MEAL = MEAL_CATEGORIES;

/** Toasts on this screen stay visible slightly longer than the default. */
const TOAST_DURATION_MS = TOAST_DURATION.long;

export function MealManagementTab() {
  const t = useTranslations("nutrition");
  const tc = useTranslations("common");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeView, setActiveView] = useState<"list" | "month" | "week" | "day">("list");
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [selectedMealForDetails, setSelectedMealForDetails] = useState<Meal | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [mealName, setMealName] = useState("");
  const [grams, setGrams] = useState<number | "">("");
  const [calories, setCalories] = useState<number | "">("");
  const [category, setCategory] = useState<string>(MEAL.breakfast);
  const [mealTime, setMealTime] = useState("07:00");

  const selectCategory = (cat: string) => {
    setCategory(cat);
    setMealTime(defaultMealTime(cat));
  };

  const getRealTimeMealDefaults = () => {
    const now = new Date();
    return { time: format(now, "HH:mm"), category: mealCategoryForHour(now.getHours()) as string };
  };
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  const showToast = (msg: string) => toast.success(msg, { durationMs: TOAST_DURATION_MS });
  const { hiddenHours, hourMenu, openHourMenu, closeHourMenu, hideHour, showAllHours } = useHiddenHours(
    STORAGE_KEYS.nutritionHiddenHours,
    showToast,
  );

  const closeFormModal = () => {
    setShowAddModal(false);
    setEditingMeal(null);
  };

  const openEditMeal = (meal: Meal) => {
    setEditingMeal(meal);
    setMealName(meal.mealName);
    setGrams(meal.grams > 0 ? meal.grams : "");
    setCalories(meal.calories > 0 ? meal.calories : "");
    setCategory(meal.note || MEAL.breakfast);

    const eatenDate = parseISO(meal.eatenAt);
    const h = String(eatenDate.getHours()).padStart(2, "0");
    const m = String(eatenDate.getMinutes()).padStart(2, "0");
    setMealTime(`${h}:${m}`);

    setShowAddModal(true);
  };

  async function loadMeals() {
    try {
      fetchWithCache<Meal[]>(API_ROUTES.meals.root, undefined, {
        onInstant: (cached) => {
          if (cached) {
            setMeals(cached);
            setLoading(false);
          }
        },
        onFresh: (data) => {
          setMeals(data);
          setLoading(false);
        },
      }).catch((e) => {
        console.error(e);
        setLoading(false);
      });
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  async function loadProfile() {
    try {
      fetchWithCache<any>(API_ROUTES.profile, undefined, {
        onInstant: (cached) => { if (cached) setProfile(cached); },
        onFresh: (data) => setProfile(data),
      }).catch(console.error);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadMeals();
    loadProfile();
  }, []);

  useDataSync(() => loadMeals(), { domains: ["meals"] });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    if (!mealName.trim()) return;
    
    // Edits keep the meal's original date even when opened from the month grid or details. New meals use the selected date.
    const eatenAt = editingMeal ? parseISO(editingMeal.eatenAt) : new Date(selectedDate);
    const [h, m] = mealTime.split(":");
    eatenAt.setHours(Number(h), Number(m), 0, 0);

    setIsSubmitting(true);
    try {
      const url = API_ROUTES.meals.root;
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

      const newMeal = await apiRequest<{ id: string; mealName: string }>(url, { method, body: bodyPayload });

      setMealName("");
      setGrams("");
      setCalories("");
      setCategory(MEAL.breakfast);
      setEditingMeal(null);
      setShowAddModal(false);
      showToast(editingMeal ? t("meal.toast.updated") : tc("mealForm.saved"));
      notifyDataChanged("meals");
      loadMeals();

      // Trigger Star AI calorie portion estimation
      if (method === "POST" && newMeal && newMeal.id) {
        emitStarNotification({
            type: "meal-estimate",
            message: tc("mealForm.loggedNotice", { mealName: newMeal.mealName }),
            mealId: newMeal.id,
            mealName: newMeal.mealName,
          });
      }
    } catch (e) {
      toast.error(apiErrorMessage(e, tc("mealForm.saveFailed")), { durationMs: TOAST_DURATION_MS });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteMeal(id: string) {
    const confirmed = await confirm({
      title: t("meal.deleteConfirm.title"),
      message: t("meal.deleteConfirm.message"),
      cancelLabel: tc("action.close"),
    });
    if (!confirmed) return;
    try {
      const res = await fetch(withQuery(API_ROUTES.meals.root, { id }), {
        method: "DELETE",
      });
      if (res.ok) {
        setSelectedMealForDetails(null);
        showToast(t("meal.toast.deleted"));
        notifyDataChanged("meals");
        loadMeals();
      }
    } catch (e) {
      console.error(e);
      toast.error(t("meal.toast.deleteFailed"), { durationMs: TOAST_DURATION_MS });
    }
  }

  // Categories helper
  const categoryConfig: Record<string, MealCategoryDetails> = {
    [MEAL.breakfast]: { label: t("meal.category.breakfast"), emoji: "🍳", bg: "bg-meal-breakfast-soft text-meal-breakfast", fill: colors.mealBreakfastSoft, border: colors.mealBreakfast, text: colors.mealBreakfast },
    [MEAL.lunch]: { label: t("meal.category.lunch"), emoji: "🍛", bg: "bg-meal-lunch-soft text-meal-lunch", fill: colors.mealLunchSoft, border: colors.mealLunch, text: colors.mealLunch },
    [MEAL.dinner]: { label: t("meal.category.dinner"), emoji: "🍲", bg: "bg-meal-dinner-soft text-meal-dinner", fill: colors.mealDinnerSoft, border: colors.mealDinner, text: colors.mealDinner },
    [MEAL.snack]: { label: t("meal.category.snack"), emoji: "🍎", bg: "bg-meal-snack-soft text-meal-snack", fill: colors.mealSnackSoft, border: colors.mealSnack, text: colors.mealSnack },
  };

  const getCategoryDetails = (note?: string | null): MealCategoryDetails => {
    const key = note || MEAL.snack;
    return categoryConfig[key] || { label: note || tc("meal.other"), emoji: "🍲", bg: "bg-gray-100 text-gray-600", fill: colors.mealSnackSoft, border: colors.inkMuted, text: colors.ink };
  };

  // Generate week days for calendar week selector
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const selectedDayMeals = meals.filter(m => isSameDay(parseISO(m.eatenAt), selectedDate));
  const selectedDayTotal = selectedDayMeals.reduce((acc, m) => acc + m.calories, 0);
  const targetCalories = profile?.dailyCalories || DEFAULT_DAILY_CALORIES;
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
    return adjustedHours * HOUR_ROW_PX;
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
    setMealName("");
    setGrams("");
    setCalories("");
    const cat = mealCategoryForHour(hour);
    setCategory(cat);
    setMealTime(`${String(hour).padStart(2, "0")}:00`);
    setShowAddModal(true);
  };

  /** Click an empty hour cell to add a meal at that time. */
  const renderHourCells = (day: Date) =>
    visibleHours(hiddenHours).map((hour) => (
      <div
        key={hour}
        onClick={() => openAddMealAtTime(day, hour)}
        className="h-[50px] border-b border-gray-50 hover:bg-purple-50/10 cursor-crosshair transition-colors"
        title={t("meal.addAtTimeHint")}
      />
    ));

  const renderTimedMeals = (day: Date, variant: "week" | "day") =>
    meals
      .filter((m) => isSameDay(parseISO(m.eatenAt), day) && getMealVisibility(m.eatenAt))
      .map((meal) => (
        <MealTimeCard
          key={meal.id}
          meal={meal}
          category={getCategoryDetails(meal.note)}
          variant={variant}
          top={getMealAbsoluteTop(meal.eatenAt)}
          onOpen={() => setSelectedMealForDetails(meal)}
        />
      ));

  if (loading) return <div className="p-8 text-center text-gray-500 font-bold">{tc("action.loadingData")}</div>;

  return (
    <div className="space-y-6 relative">
      
      {/* Top Header Selector: List vs Month vs Week vs Day */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-100 pb-4 mb-4">
        <h3 className="text-lg font-bold text-primary-ink">{t("meal.title")}</h3>
        <div id="tour-meal-views" className="w-full sm:w-96">
          <SegmentedControl
            size="sm"
            ariaLabel={t("meal.title")}
            options={[
              { value: "list", label: t("meal.viewList") },
              { value: "month", label: tc("period.month") },
              { value: "week", label: tc("period.week") },
              { value: "day", label: tc("period.day") },
            ]}
            value={activeView}
            onChange={setActiveView}
          />
        </div>
      </div>

      {/* LIST VIEW (Original layout) */}
      {activeView === "list" && (
        <div className="space-y-6">
          {/* Top Row: Week calendar picker & Progress card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Week Selector */}
            <div id="tour-meal-week-picker" className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 capitalize">
                  {t("meal.monthTitle", { monthYear: formatDate(selectedDate, "MM/yyyy") })}
                </h2>
                <div className="flex gap-2">
                  <IconButton onClick={() => setSelectedDate(subDays(selectedDate, 7))} label={t("meal.previousWeek")}>
                    <ChevronLeft className="h-5 w-5" />
                  </IconButton>
                  <IconButton onClick={() => setSelectedDate(addDays(selectedDate, 7))} label={t("meal.nextWeek")}>
                    <ChevronRight className="h-5 w-5" />
                  </IconButton>
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
                        isSelected ? "bg-primary text-white shadow-md scale-105" : 
                        isToday ? "bg-primary-soft text-primary" : "hover:bg-gray-50 text-gray-600"
                      }`}
                    >
                      <span className={`text-2xs mb-1 ${isSelected ? "text-purple-100" : "text-gray-400"}`}>
                        {formatDate(day, "E")}
                      </span>
                      <span className="font-bold text-base">{format(day, "d")}</span>
                      {hasMeals && !isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1"></div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Daily Calorie Goal Progress Card */}
            <div id="tour-meal-progress" className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
              <h3 className="text-gray-500 text-sm font-bold text-center">{t("meal.dayCalories", { dayMonth: format(selectedDate, "dd/MM") })}</h3>
              <div className="flex items-center justify-center gap-6 my-4">
                <div className="relative flex h-24 w-24 items-center justify-center">
                  <svg className="h-full w-full -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke={colors.primarySoft} strokeWidth="8" fill="transparent" />
                    <circle 
                      cx="48" 
                      cy="48" 
                      r="40" 
                      stroke={colors.primary} 
                      strokeWidth="8" 
                      fill="transparent" 
                      strokeDasharray={251} 
                      strokeDashoffset={251 - (251 * progressPercent) / 100} 
                      strokeLinecap="round" 
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-base font-black text-primary-ink">{progressPercent}%</span>
                  </div>
                </div>
                <div className="text-left space-y-1">
                  <div>
                    <p className="text-2xs text-gray-400 font-bold uppercase tracking-wider">{t("meal.consumed")}</p>
                    <p className="text-xl font-extrabold text-gray-800">{selectedDayTotal} <span className="text-xs text-gray-400 font-normal">{tc("unit.kcal")}</span></p>
                  </div>
                  <div>
                    <p className="text-2xs text-gray-400 font-bold uppercase tracking-wider">{t("meal.target")}</p>
                    <p className="text-sm font-bold text-primary">{targetCalories} <span className="text-xs text-primary/70 font-normal">{tc("unit.kcal")}</span></p>
                  </div>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>
          </div>

          {/* Meals List & Charts row */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">
                  {t("meal.dayMenu", { dayMonth: format(selectedDate, "dd/MM") })}
                </h3>
                <Button
                  id="tour-meal-add-btn"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => { 
                    setMealName("");
                    setGrams("");
                    setCalories("");
                    setEditingMeal(null);
                    const defaults = getRealTimeMealDefaults();
                    setCategory(defaults.category); 
                    setMealTime(defaults.time); 
                    setShowAddModal(true); 
                  }}
                >
                  {t("meal.addMeal")}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 h-full">
                <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
                  <span className="text-gray-500 font-bold">{t("meal.totalEnergy")}</span>
                  <span className="text-2xl font-black text-primary">{selectedDayTotal} <span className="text-base text-gray-400 font-normal">{tc("unit.kcal")}</span></span>
                </div>

                {selectedDayMeals.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 flex flex-col items-center">
                    <Utensils className="h-12 w-12 mb-3 text-gray-200" />
                    <p className="text-sm font-medium">{t("meal.emptyDay")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDayMeals.map(meal => {
                      const cat = getCategoryDetails(meal.note);
                      return (
                        <div 
                          key={meal.id} 
                          onClick={() => setSelectedMealForDetails(meal)}
                          className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-primary-subtle/50 transition-colors border border-transparent hover:border-primary-line cursor-pointer group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-xl select-none">
                              {cat.emoji}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-gray-800">{meal.mealName}</h4>
                                <span className={`text-2xs px-2.5 py-0.5 rounded-full font-bold select-none ${cat.bg}`}>
                                  {cat.label}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 mt-0.5">{meal.grams > 0 ? t("meal.unit.grams", { grams: String(meal.grams) }) : tc("meal.optional")}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-bold text-gray-800">{meal.calories > 0 ? t("meal.unit.calories", { calories: String(meal.calories) }) : tc("meal.optional")}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{format(parseISO(meal.eatenAt), "HH:mm")}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <IconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditMeal(meal);
                                }}
                                label={t("meal.editMeal")}
                              >
                                <Pencil className="h-5 w-5" />
                              </IconButton>
                              <IconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteMeal(meal.id);
                                }}
                                label={t("meal.deleteMeal")}
                              >
                                <Trash2 className="h-5 w-5" />
                              </IconButton>
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
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 h-full flex flex-col">
                <h3 className="text-gray-800 font-semibold mb-4 text-sm">{t("meal.chartTitle")}</h3>
                <div className="flex-1 min-h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorCal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={colors.primary} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: colors.inkSubtle }} />
                      <ChartTooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area type="monotone" dataKey="calories" stroke={colors.primary} strokeWidth={3} fillOpacity={1} fill="url(#colorCal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* MONTH VIEW CALENDAR */}
      {activeView === "month" && (
        <div className="bg-white rounded-4xl p-6 shadow-sm border border-gray-100 space-y-6">
          {/* Calendar Month Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-50">
            <h2 className="text-xl font-bold text-gray-800 capitalize flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {t("meal.monthTitle", { monthYear: formatDate(selectedDate, "MM / yyyy") })}
            </h2>
            <div className="flex gap-2">
              <IconButton onClick={() => setSelectedDate(subMonths(selectedDate, 1))} label={t("meal.previousMonth")}>
                <ChevronLeft className="h-5 w-5" />
              </IconButton>
              <Button variant="secondary" size="sm" onClick={() => setSelectedDate(new Date())}>
                {tc("period.today")}
              </Button>
              <IconButton onClick={() => setSelectedDate(addMonths(selectedDate, 1))} label={t("meal.nextMonth")}>
                <ChevronRight className="h-5 w-5" />
              </IconButton>
            </div>
          </div>

          <MonthGrid
            days={daysInMonth}
            month={selectedDate}
            cellClassName="min-h-[110px]"
            listClassName="space-y-1 max-h-[80px]"
            onDayClick={handleMonthDayClick}
            renderDayItems={(day) =>
              meals.filter(m => isSameDay(parseISO(m.eatenAt), day)).map(meal => {
                const cat = getCategoryDetails(meal.note);
                return (
                  <div 
                    key={meal.id}
                    onClick={(e) => { e.stopPropagation(); setSelectedMealForDetails(meal); }}
                    className={`text-3xs font-bold p-1 rounded-lg truncate flex items-center gap-1 ${cat.bg} hover:brightness-95`}
                  >
                    <span>{cat.emoji}</span>
                    <span className="truncate flex-1">{meal.mealName}</span>
                    {meal.calories > 0 && <span className="opacity-80">{t("meal.unit.caloriesShort", { calories: String(meal.calories) })}</span>}
                  </div>
                );
              })
            }
          />
        </div>
      )}

      {/* WEEK & DAY VIEWS */}
      {(activeView === "week" || activeView === "day") && (
        <div className="bg-white rounded-4xl p-6 shadow-sm border border-gray-100 flex flex-col">
          {/* Calendar Navigation */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
            <h2 className="text-xl font-bold text-gray-800 capitalize flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {activeView === "week" 
                ? t("meal.weekTitle", { monthYear: formatDate(selectedDate, "MM / yyyy") })
                : t("meal.dayTitle", { date: formatDate(selectedDate, "dd / MM / yyyy") })
              }
            </h2>
            <div className="flex gap-2">
              <IconButton
                onClick={() => setSelectedDate(prev => activeView === "week" ? subWeeks(prev, 1) : subDays(prev, 1))}
                label={activeView === "week" ? t("meal.previousWeek") : t("meal.previousDay")}
              >
                <ChevronLeft className="h-5 w-5" />
              </IconButton>
              <Button variant="secondary" size="sm" onClick={() => setSelectedDate(new Date())}>
                {tc("period.today")}
              </Button>
              <IconButton
                onClick={() => setSelectedDate(prev => activeView === "week" ? addWeeks(prev, 1) : addDays(prev, 1))}
                label={activeView === "week" ? t("meal.nextWeek") : t("meal.nextDay")}
              >
                <ChevronRight className="h-5 w-5" />
              </IconButton>
            </div>
          </div>

          {/* Hour Grid Layout */}
          <div className="overflow-x-auto">
            <div className="min-w-[600px] flex flex-col">
              <TimeGridHeader
                view={activeView}
                weekDays={weekDays}
                date={selectedDate}
                hiddenCount={hiddenHours.length}
                onShowAllHours={showAllHours}
              />

              {/* Grid Body */}
              <div className="max-h-[500px] overflow-y-auto relative scrollbar-thin">
                <div className="grid grid-cols-8 relative">
                  <HourLabels hiddenHours={hiddenHours} onHourClick={openHourMenu} />

                  {activeView === "week" ? (
                    weekDays.map((day) => (
                      <div
                        key={day.toISOString()}
                        style={{ height: `${dayColumnHeight(hiddenHours)}px` }}
                        className={`col-span-1 relative border-r border-gray-50 ${isSameDay(day, new Date()) ? "bg-purple-50/5" : ""}`}
                      >
                        {renderHourCells(day)}
                        {renderTimedMeals(day, "week")}
                      </div>
                    ))
                  ) : (
                    <div style={{ height: `${dayColumnHeight(hiddenHours)}px` }} className="col-span-7 relative">
                      {renderHourCells(selectedDate)}
                      {renderTimedMeals(selectedDate, "day")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <MealDetailsModal
        meal={selectedMealForDetails}
        category={selectedMealForDetails && getCategoryDetails(selectedMealForDetails.note)}
        onClose={() => setSelectedMealForDetails(null)}
        onEdit={(meal) => {
          setSelectedMealForDetails(null);
          openEditMeal(meal);
        }}
        onDelete={deleteMeal}
      />

      <MealFormModal
        open={showAddModal}
        isEditing={editingMeal !== null}
        mealName={mealName}
        onMealNameChange={setMealName}
        category={category}
        onCategoryChange={selectCategory}
        mealTime={mealTime}
        onMealTimeChange={setMealTime}
        grams={grams}
        onGramsChange={setGrams}
        calories={calories}
        onCaloriesChange={setCalories}
        isSubmitting={isSubmitting}
        onSubmit={onSubmit}
        onClose={closeFormModal}
      />

      <HourContextMenu
        menu={hourMenu}
        canShowAll={hiddenHours.length > 0}
        onHide={hideHour}
        onShowAll={showAllHours}
        onClose={closeHourMenu}
      />
    </div>
  );
}
