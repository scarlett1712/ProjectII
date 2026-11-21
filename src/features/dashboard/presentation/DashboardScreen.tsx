"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { apiErrorMessage, apiRequest } from "@/shared/client/api";
import { toOptionalDateTimeLocalValue } from "@/shared/domain/time";
import { notifyDataChanged } from "@/shared/client/cacheSync";
import { getDashboardSteps } from "./dashboardTour";
import { OnboardingTour } from "@/shared/ui/OnboardingTour";
import { TOAST_DURATION, useConfirm, useToast, type ToastTone } from "@/shared/ui/components";
import { TransactionModal } from "@/features/budget/presentation/components/TransactionModal";
import { QuickMealModal } from "@/features/dashboard/presentation/components/QuickMealModal";
import { DashboardNoteModal } from "@/features/dashboard/presentation/components/DashboardNoteModal";
import { DashboardCalendarModal } from "@/features/dashboard/presentation/components/DashboardCalendarModal";
import { defaultColors } from "@/shared/theme/palettes";
import { MEAL_CATEGORIES, mealCategoryForHour } from "@/features/nutrition/domain/mealCategories";
import { API_ROUTES, withQuery } from "@/shared/config/routes";
import { useSeriesScopeChoice } from "@/features/calendar/presentation/components/useSeriesScopeChoice";
import { emitStarNotification } from "@/shared/client/appEvents";
import { STORAGE_KEYS } from "@/shared/client/storageKeys";
import { DEFAULT_DAILY_CALORIES, DEFAULT_DAILY_WATER_ML } from "@/shared/domain/healthDefaults";
import { SYSTEM_TAG_IDS } from "@/features/calendar/domain/systemTags";
import { darkenedTextColor } from "@/shared/theme/colorMath";
import { buildScheduleItemPayload, type ScheduleItemDraft } from "@/features/calendar/domain/scheduleItemPayload";
import { emptyScheduleItemDraft } from "@/features/calendar/presentation/scheduleItemForm";
import { dashboardTaskBackground } from "@/features/calendar/presentation/taskNoteColors";
import { useTaskPositions } from "@/features/calendar/presentation/components/useTaskPositions";
import { useCompleteTask } from "@/features/calendar/presentation/components/useCompleteTask";
import { FloatingTaskNote } from "@/features/calendar/presentation/components/FloatingTaskNote";
import { useDashboardData, type DashboardTask } from "@/features/dashboard/presentation/useDashboardData";
import { QuickActions } from "@/features/dashboard/presentation/components/QuickActions";
import { DeadlinesSection } from "@/features/dashboard/presentation/components/DeadlinesSection";
import { EnergyWaterCard } from "@/features/dashboard/presentation/components/EnergyWaterCard";
import { WalletChartCard } from "@/features/dashboard/presentation/components/WalletChartCard";
import { TodayMealsCard } from "@/features/dashboard/presentation/components/TodayMealsCard";

/** Dashboard toast duration, preserved from before the shared toast component. */
const TOAST_DURATION_MS = TOAST_DURATION.long;

/** Initial empty task draft. openEditTask populates the form when it opens. */
const emptyNoteForm = () => emptyScheduleItemDraft({ itemType: "task", notification: true });
/** Quick-create defaults to an event with the event tag and reminders enabled. */
const emptyQuickScheduleForm = () => emptyScheduleItemDraft({ tagId: SYSTEM_TAG_IDS.event, notification: true });

type DashboardModal = { type: "note"; task: DashboardTask } | { type: "meal" | "transaction" | "schedule" };

export default function DashboardScreen() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const tourSteps = useMemo(() => getDashboardSteps(t), [t]);
  const { tasks, meals, profile, waterData, calendarTags, budgetAccounts, budgetCategories,
    walletData, walletChartView, setWalletChartView, fetchBudgetStats, fetchMeals, fetchWater, fetchTasks } = useDashboardData();
  const [modal, setModal] = useState<DashboardModal | null>(null);
  const editingTask = modal?.type === "note" ? modal.task : null;
  const [noteForm, setNoteForm] = useState<ScheduleItemDraft>(emptyNoteForm);
  const patchNoteForm = (patch: Partial<ScheduleItemDraft>) => setNoteForm((prev) => ({ ...prev, ...patch }));

  // Quick event or task creation
  const [scheduleForm, setScheduleForm] = useState<ScheduleItemDraft>(emptyQuickScheduleForm);
  const patchScheduleForm = (patch: Partial<ScheduleItemDraft>) => setScheduleForm((prev) => ({ ...prev, ...patch }));

  const taskPositions = useTaskPositions(STORAGE_KEYS.dashboardTaskPositions);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toast = useToast();
  const confirm = useConfirm();
  const { askScope, scopeModal } = useSeriesScopeChoice("task");
  const showToast = (message: string, tone: ToastTone = "success") =>
    toast.show(message, { tone, durationMs: TOAST_DURATION_MS });

  const [mealForm, setMealForm] = useState({
    name: "",
    grams: "",
    calories: "",
    category: MEAL_CATEGORIES.breakfast as string,
    time: "07:00"
  });

  const logWaterQuick = async (amountMl: number) => {
    try {
      const res = await fetch(API_ROUTES.water, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountMl }),
      });
      if (res.ok) {
        showToast(tc("water.loggedNotice", { amountMl: String(amountMl) }));
        notifyDataChanged("water");
        fetchWater();
      } else {
        showToast(t("energyWater.waterLogFailed"), "error");
      }
    } catch (e) {
      console.error(e);
      showToast(t("energyWater.serverUnreachable"), "error");
    }
  };
  const handleSaveMeal = async () => {
    if (!mealForm.name) return;
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const eatenAt = new Date();
      const [h, m] = (mealForm.time || "07:00").split(":");
      eatenAt.setHours(Number(h), Number(m), 0, 0);

      const newMeal = await apiRequest<{ id: string; mealName: string }>(API_ROUTES.meals.root, {
        method: "POST",
        body: {
          mealName: mealForm.name,
          grams: mealForm.grams === "" ? 0 : Number(mealForm.grams),
          calories: mealForm.calories === "" ? 0 : Number(mealForm.calories),
          note: mealForm.category,
          eatenAt: eatenAt.toISOString(),
        },
      });
      notifyDataChanged("meals");
      fetchMeals();
      setModal(null);
      setMealForm({ name: "", grams: "", calories: "", category: MEAL_CATEGORIES.breakfast, time: "07:00" });
      showToast(tc("mealForm.saved"));

      // Trigger Star AI calorie portion estimation
      if (newMeal && newMeal.id) {
        emitStarNotification({
            type: "meal-estimate",
            message: tc("mealForm.loggedNotice", { mealName: newMeal.mealName }),
            mealId: newMeal.id,
            mealName: newMeal.mealName,
          });
      }
    } catch (err) {
      showToast(apiErrorMessage(err, tc("mealForm.saveFailed")), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRecurringTask = (task: DashboardTask) => !!task?.recurrence && task.recurrence !== "NONE";

  const handleSaveTask = async () => {
    if (!noteForm.title) return;
    if (isSubmitting) return;
    // Ask for the edit scope on recurring tasks, as Calendar does, to avoid editing the whole series by default.
    const mode = editingTask && isRecurringTask(editingTask) ? await askScope("save") : undefined;
    if (mode === null) return;
    setIsSubmitting(true);
    try {
      // Omit completed so editing a note preserves its completion state.
      const payload: Record<string, unknown> = { ...buildScheduleItemPayload(noteForm, { withCompleted: false }) };

      if (editingTask) payload.id = editingTask.id;

      await apiRequest(withQuery(API_ROUTES.tasks, { mode }), {
        method: editingTask ? "PATCH" : "POST",
        body: payload,
      });
      notifyDataChanged("tasks");
      fetchTasks();
      setModal(null);
      patchNoteForm({ title: "", startAt: "", description: "", recurrence: "NONE", recurrenceEnd: "" });
      showToast(editingTask ? t("tasks.updated") : t("tasks.added"));
    } catch (err) {
      showToast(apiErrorMessage(err, t("tasks.saveFailed")), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCalendarItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.title.trim()) return;
    if (isSubmitting) return;
    if (scheduleForm.itemType === "event" && (!scheduleForm.startAt || !scheduleForm.endAt)) {
      showToast(t("schedule.missingTime"), "error");
      return;
    }
    const payload = buildScheduleItemPayload(scheduleForm);

    setIsSubmitting(true);
    try {
      const url = scheduleForm.itemType === "event" ? API_ROUTES.calendar : API_ROUTES.tasks;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setModal(null);
        showToast(scheduleForm.itemType === "event" ? tc("schedule.created") : t("schedule.taskCreated"));
        notifyDataChanged("calendar");
        fetchTasks();
      } else {
        const errorData = await res.json();
        showToast(errorData.error || t("schedule.createFailed"), "error");
      }
    } catch (e) {
      console.error(e);
      showToast(t("schedule.serverError"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!editingTask) return;
    // Ask whether to delete this occurrence, this and later occurrences, or the entire recurring task.
    let mode: "one" | "future" | "all" | undefined;
    if (isRecurringTask(editingTask)) {
      const chosen = await askScope("delete");
      if (!chosen) return;
      mode = chosen;
    } else if (!(await confirm({ message: t("tasks.deleteMessage"), cancelLabel: tc("action.close") }))) {
      return;
    }
    try {
      await apiRequest(withQuery(API_ROUTES.tasks, { id: editingTask.id, mode }), { method: "DELETE" });
      setModal(null);
      showToast(t("tasks.deleted"));
      notifyDataChanged("tasks");
      fetchTasks();
    } catch (err) {
      showToast(apiErrorMessage(err, t("tasks.deleteFailed")), "error");
    }
  };

  /** Open the note editor and display its deadline in local time to avoid a seven-hour UTC shift. */
  const openEditTask = (task: DashboardTask) => {
    setNoteForm(emptyScheduleItemDraft({
      itemType: "task",
      title: task.title,
      startAt: toOptionalDateTimeLocalValue(task.dueAt),
      description: task.description || "",
      notification: task.notification || false,
      tagId: task.tagId || "",
      noteColor: task.noteColor || task.color || defaultColors.note,
      recurrence: task.recurrence || "NONE",
      recurrenceEnd: toOptionalDateTimeLocalValue(task.recurrenceEnd),
    }));
    setModal({ type: "note", task });
  };

  /** Complete one occurrence and remove its pinned position, including the original series position. */
  const completeTask = useCompleteTask<DashboardTask>(
    (task) => {
      taskPositions.remove(task.id, { withSeries: true });
      notifyDataChanged("tasks");
      fetchTasks();
      showToast(tc("schedule.completedNotice", { title: task.title }));
    },
    (err) => showToast(apiErrorMessage(err, tc("schedule.completeFailed")), "error"),
  );

  // Calculations for charts
  const today = new Date().toDateString();

  const todayMeals = meals.filter(m => new Date(m.eatenAt).toDateString() === today);
  const totalCalories = todayMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
  const calorieTarget = profile?.dailyCalories || DEFAULT_DAILY_CALORIES;
  const caloriePercent = Math.min(100, (totalCalories / calorieTarget) * 100);

  const todayWater = waterData.logs.filter((l: any) => new Date(l.loggedAt).toDateString() === today);
  const totalWater = todayWater.reduce((acc: number, l: any) => acc + (l.amountMl || 0), 0);
  const waterTarget = waterData.goal?.dailyTargetMl || DEFAULT_DAILY_WATER_ML;
  const waterPercent = Math.min(100, (totalWater / waterTarget) * 100);

  // Filter tasks to show inline only if NOT floating and NOT completed, sorted by deadline approaching first
  const activeTasks = tasks.filter(t => !t.completed);
  const sortedActiveTasks = [...activeTasks].sort((a, b) => {
    if (a.dueAt && b.dueAt) {
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    }
    if (a.dueAt && !b.dueAt) return -1;
    if (!a.dueAt && b.dueAt) return 1;
    return 0;
  });

  const inlineTasks = sortedActiveTasks.filter(t => !taskPositions.isFloating(t.id));
  const floatingTasks = sortedActiveTasks.filter(t => taskPositions.isFloating(t.id));

  return (
    <div className="relative space-y-6 sm:space-y-8 min-h-[80vh] dashboard-container">
      {/* Quick Actions Row */}
      <QuickActions
        onMeal={() => {
          const now = new Date();
          setMealForm({ name: "", grams: "", calories: "", category: mealCategoryForHour(now.getHours()), time: format(now, "HH:mm") });
          setModal({ type: "meal" });
        }}
        onSchedule={() => { setScheduleForm(emptyQuickScheduleForm()); setModal({ type: "schedule" }); }}
        onTransaction={() => setModal({ type: "transaction" })}
      />
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 pb-10">
        <DeadlinesSection inlineTasks={inlineTasks} activeCount={activeTasks.length} openEditTask={openEditTask} completeTask={completeTask} taskPositions={taskPositions} />
        <EnergyWaterCard totalCalories={totalCalories} caloriePercent={caloriePercent} totalWater={totalWater} waterPercent={waterPercent} logWaterQuick={logWaterQuick} />
        <WalletChartCard walletData={walletData} walletChartView={walletChartView} onViewChange={(view) => { setWalletChartView(view); fetchBudgetStats(view); }} />
        <TodayMealsCard todayMeals={todayMeals} />
      </div>

      {/* Note Modal */}
      <DashboardNoteModal
        open={modal?.type === "note"}
        isEditing={!!editingTask}
        values={noteForm}
        onChange={patchNoteForm}
        tags={calendarTags}
        isSubmitting={isSubmitting}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        onClose={() => {
          setModal(null);
        }}
      />

      {/* Meal Modal */}
      <QuickMealModal
        showAddMeal={modal?.type === "meal"}
        onClose={() => setModal(null)}
        mealForm={mealForm}
        setMealForm={setMealForm}
        handleSaveMeal={handleSaveMeal}
        isSubmitting={isSubmitting}
      />

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={modal?.type === "transaction"}
        onClose={() => setModal(null)}
        onSuccess={() => {
          showToast(t("wallet.transactionLogged"));
          fetchBudgetStats();
        }}
        accounts={budgetAccounts}
        categories={budgetCategories}
      />

      {/* Calendar Modal */}
      <DashboardCalendarModal
        open={modal?.type === "schedule"}
        values={scheduleForm}
        onChange={patchScheduleForm}
        tags={calendarTags}
        isSubmitting={isSubmitting}
        onSubmit={handleSaveCalendarItem}
        onClose={() => setModal(null)}
      />

      {/* FLOATING WHITEBOARD CANVAS TASKS */}
      {floatingTasks.map((task) => {
        const background = dashboardTaskBackground(task);
        return (
          <FloatingTaskNote
            key={task.id}
            task={task}
            position={taskPositions.positionOf(task.id)}
            backgroundColor={background}
            textColor={darkenedTextColor(background)}
            onMove={(offset) => taskPositions.movePosition(task.id, offset)}
            onOpen={() => openEditTask(task)}
            onComplete={() => void completeTask(task)}
            onUnpin={() => {
              taskPositions.remove(task.id);
              showToast(tc("schedule.removedFromScreen"));
            }}
          />
        );
      })}

      {scopeModal}
      <OnboardingTour pageKey="dashboard" steps={tourSteps} />
    </div>
  );
}
