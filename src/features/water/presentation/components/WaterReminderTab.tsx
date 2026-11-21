"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, isSameDay, parseISO } from "date-fns";
import { fetchWithCache, notifyDataChanged } from "@/shared/client/cacheSync";
import { colors } from "@/shared/theme/tokens";
import { useTranslations } from "next-intl";
import { Button, Field, FieldLabel, IconButton, Modal, TextInput, useConfirm, useToast } from "@/shared/ui/components";
import { apiErrorMessage, apiRequest } from "@/shared/client/api";
import { API_ROUTES, withQuery } from "@/shared/config/routes";
import { useDataSync } from "@/shared/client/hooks";
import { DEFAULT_DAILY_WATER_ML } from "@/shared/domain/healthDefaults";

const GOAL_FORM_ID = "water-goal-form";

type WaterGoal = { dailyTargetMl: number };
type WaterLog = { id: string; amountMl: number; loggedAt: string };
type WaterSlot = { id: string; slotTime: string; amountMl: number };

export function WaterReminderTab() {
  const t = useTranslations("water");
  const tc = useTranslations("common");
  const confirm = useConfirm();
  const toast = useToast();
  const [goal, setGoal] = useState<WaterGoal | null>(null);
  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [slots, setSlots] = useState<WaterSlot[]>([]);
  const [loading, setLoading] = useState(true);

  // Goal & Slots settings states
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [targetInput, setTargetInput] = useState(DEFAULT_DAILY_WATER_ML);
  const [slotsInput, setSlotsInput] = useState<string[]>([]);
  const [newTimeInput, setNewTimeInput] = useState("");
  const [isLoggingWater, setIsLoggingWater] = useState(false);

  async function loadData() {
    // Background sync must preserve edits in the open settings dialog, so leave its inputs untouched here.
    // Populate the inputs in openGoalSettings when the dialog opens.
    fetchWithCache<any>(API_ROUTES.water, undefined, {
      onData: (data) => {
        setGoal(data.goal);
        setLogs(data.logs || []);
        setSlots(data.slots || []);
        setLoading(false);
      },
    }).catch((e) => {
      console.error(e);
      toast.error(apiErrorMessage(e, t("tab.toast.loadFailed")));
      setLoading(false);
    });
  }

  function openGoalSettings() {
    setTargetInput(goal?.dailyTargetMl || DEFAULT_DAILY_WATER_ML);
    setSlotsInput(slots.map((s) => s.slotTime));
    setShowGoalModal(true);
  }

  // Load on mount. useEffectEvent calls the latest loadData without subscribing to its changing identity.
  const loadOnMount = useEffectEvent(() => loadData());
  useEffect(() => {
    loadOnMount();
  }, []);

  useDataSync(() => loadData(), { domains: ["water"] });

  async function logWater(amountMl: number) {
    if (isLoggingWater) return;
    setIsLoggingWater(true);
    try {
      await apiRequest(API_ROUTES.water, { method: "POST", body: { amountMl } });
      notifyDataChanged("water");
      loadData();
      toast.success(t("tab.toast.logged", { ml: String(amountMl) }));
    } catch (e) {
      toast.error(apiErrorMessage(e, t("tab.toast.saveFailed")));
    } finally {
      setIsLoggingWater(false);
    }
  }

  async function deleteLog(id: string) {
    const confirmed = await confirm({
      title: tc("action.confirmDelete"),
      message: t("tab.deleteConfirm.message"),
      confirmLabel: tc("action.confirm"),
    });
    if (!confirmed) return;
    try {
      await apiRequest(withQuery(API_ROUTES.water, { id, type: "log" }), { method: "DELETE" });
      notifyDataChanged("water");
      loadData();
      toast.success(t("tab.toast.deleted"));
    } catch (e) {
      toast.error(apiErrorMessage(e, t("tab.toast.saveFailed")));
    }
  }

  async function saveGoal(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiRequest(API_ROUTES.water, {
        method: "POST",
        body: { type: "goal", dailyTargetMl: targetInput, slots: slotsInput },
      });
      setShowGoalModal(false);
      notifyDataChanged("water");
      loadData();
      toast.success(t("tab.toast.goalSaved"));
    } catch (e) {
      toast.error(apiErrorMessage(e, t("tab.toast.saveFailed")));
    }
  }

  function addSlotTime() {
    if (!newTimeInput) return;
    if (slotsInput.includes(newTimeInput)) return;
    const updated = [...slotsInput, newTimeInput].sort();
    setSlotsInput(updated);
    setNewTimeInput("");
  }

  function removeSlotTime(time: string) {
    setSlotsInput(slotsInput.filter(t => t !== time));
  }

  if (loading) return <div className="p-8 text-center text-gray-500">{tc("action.loadingData")}</div>;

  const todayLogs = logs.filter(l => isSameDay(parseISO(l.loggedAt), new Date()));
  const currentTotal = todayLogs.reduce((acc, l) => acc + l.amountMl, 0);
  const target = goal?.dailyTargetMl || DEFAULT_DAILY_WATER_ML;
  const progress = Math.min(100, Math.round((currentTotal / target) * 100));

  // Prepare chart data (last 7 days)
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayLogs = logs.filter(l => isSameDay(parseISO(l.loggedAt), d));
    const total = dayLogs.reduce((acc, l) => acc + l.amountMl, 0);
    chartData.push({
      name: format(d, "dd/MM"),
      amount: total,
    });
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div id="tour-water-chart-box" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center relative group">
          <IconButton
            onClick={openGoalSettings}
            className="absolute top-4 right-4"
            label={t("tab.settingsAria")}
            title={t("tab.settingsTitle")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </IconButton>

          <div className="w-20 h-20 rounded-full bg-primary-subtle flex items-center justify-center mb-4 relative overflow-hidden">
             <div className="absolute bottom-0 w-full bg-primary opacity-20 transition-all duration-1000" style={{ height: `${progress}%` }}></div>
             <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-primary z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
             </svg>
          </div>
          <h3 className="text-gray-500 text-sm font-medium">{t("tab.drankToday")}</h3>
          <p className="text-3xl font-bold text-gray-800 mt-1">{currentTotal} <span className="text-lg text-gray-500 font-normal">{t("tab.ofTarget", { target: String(target) })}</span></p>
          <div className="w-full bg-gray-100 rounded-full h-2 mt-4">
            <div className="bg-primary h-2 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
          <h3 className="text-gray-800 font-semibold mb-4">{t("tab.chartTitle")}</h3>
          <div className="h-[140px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.surfaceMuted} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: colors.inkSubtle }} />
                <YAxis hide />
                <Tooltip cursor={{ fill: colors.surfaceMuted }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="amount" fill={colors.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Water Logging */}
      <div id="tour-water-quick-log" className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-gray-700 font-bold text-sm">{t("tab.quickLog")}</span>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          {[100, 200, 250, 350, 500].map(amount => (
            <button 
              key={amount} 
              onClick={() => logWater(amount)}
              className="flex-1 min-w-[52px] sm:flex-initial px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold bg-primary-soft text-primary hover:bg-primary hover:text-white transition-all active:scale-95 shadow-sm border border-primary-subtle text-center whitespace-nowrap"
            >
              {t("tab.quickLogAmount", { ml: String(amount) })}
            </button>
          ))}
        </div>
      </div>

      {/* Main Hydration Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reminder Slots List */}
        <div id="tour-water-slots" className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-gray-800 font-semibold mb-4 text-lg">{tc("water.reminderSlots")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {slots.length === 0 ? (
              <div className="text-center py-8 text-gray-400 col-span-full">
                <p className="text-sm">{t("tab.noSlots")}</p>
                <button 
                  onClick={openGoalSettings} 
                  className="mt-2 text-xs font-bold text-primary hover:underline"
                >
                  {t("tab.setupNow")}
                </button>
              </div>
            ) : (
              slots.map((slot) => {
                // Heuristic: check if this slot is already logged today (e.g. if we have a log around slotTime hour)
                const [shour] = slot.slotTime.split(":");
                const isDrunk = todayLogs.some(l => {
                  const logHour = format(parseISO(l.loggedAt), "HH");
                  return logHour === shour;
                });

                return (
                  <div key={slot.id} className={`border rounded-2xl p-4 flex items-center justify-between transition-colors group ${
                    isDrunk 
                      ? "bg-emerald-50/50 border-emerald-100 hover:border-emerald-200" 
                      : "border-gray-100 hover:border-primary-line-strong hover:bg-primary-subtle/50"
                  }`}>
                    <div>
                      <p className={`text-xl font-bold transition-colors ${
                        isDrunk ? "text-emerald-700" : "text-gray-700 group-hover:text-primary"
                      }`}>{slot.slotTime}</p>
                      <p className="text-sm text-gray-500">{t("unit.amount", { ml: String(slot.amountMl) })}</p>
                    </div>
                    {isDrunk ? (
                      <span className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold select-none">
                        ✓
                      </span>
                    ) : (
                      <button 
                        onClick={() => logWater(slot.amountMl)}
                        className="w-10 h-10 rounded-full border-2 border-line flex items-center justify-center text-transparent hover:border-primary hover:text-primary hover:bg-primary/10 transition-all active:scale-95"
                        title={t("tab.markDrunk")}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* History List */}
        <div className="lg:col-span-1 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col min-h-[300px]">
          <h3 className="text-gray-800 font-semibold mb-4 text-lg">{t("tab.historyTitle")}</h3>
          {todayLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-400 flex-1 flex flex-col items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs">{t("tab.noLogsToday")}</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1 flex-1">
              {todayLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 hover:bg-primary-subtle/40 transition-colors border border-transparent hover:border-primary-line-strong">
                  <div className="flex items-center gap-3">
                    <span className="text-xl select-none">💧</span>
                    <div>
                      <p className="font-bold text-gray-700">{t("unit.amount", { ml: String(log.amountMl) })}</p>
                      <p className="text-2xs text-gray-400">{format(parseISO(log.loggedAt), "HH:mm")}</p>
                    </div>
                  </div>
                  <IconButton
                    onClick={() => deleteLog(log.id)}
                    label={t("tab.deleteLogAria")}
                    title={t("tab.deleteLogTitle")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </IconButton>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Goal & Slots settings modal */}
      <Modal
        open={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        title={t("tab.modal.title")}
        size="md"
        closeOnBackdrop={false}
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setShowGoalModal(false)}>
              {tc("action.cancel")}
            </Button>
            <Button type="submit" form={GOAL_FORM_ID} className="flex-1">
              {t("tab.modal.save")}
            </Button>
          </>
        }
      >
        <form id={GOAL_FORM_ID} onSubmit={saveGoal} className="space-y-5">
          <Field label={t("tab.modal.dailyTarget")}>
            <TextInput
              required
              type="number"
              min="500"
              step="50"
              value={targetInput}
              onChange={e => setTargetInput(Number(e.target.value))}
            />
          </Field>

          <div>
            <FieldLabel htmlFor="water-new-slot-time">{t("tab.modal.slotTimes")}</FieldLabel>
            <div className="flex gap-2 mb-3">
              <TextInput
                id="water-new-slot-time"
                type="time"
                value={newTimeInput}
                onChange={e => setNewTimeInput(e.target.value)}
                className="flex-1"
              />
              <Button onClick={addSlotTime}>{tc("action.add")}</Button>
            </div>

            <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto p-2 bg-gray-50 rounded-2xl border border-gray-100">
              {slotsInput.length === 0 ? (
                <span className="text-xs text-gray-400 p-2">{t("tab.modal.emptySlots")}</span>
              ) : (
                slotsInput.map(time => (
                  <span key={time} className="flex items-center gap-1 text-xs font-bold bg-purple-50 text-primary px-3 py-1.5 rounded-full select-none">
                    <span>{time}</span>
                    <button
                      type="button"
                      onClick={() => removeSlotTime(time)}
                      className="hover:text-red-500 text-gray-400 font-bold ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
