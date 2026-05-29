"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, isSameDay, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

type WaterGoal = { dailyTargetMl: number };
type WaterLog = { id: string; amountMl: number; loggedAt: string };
type WaterSlot = { id: string; slotTime: string; amountMl: number };

export function WaterReminderTab() {
  const [goal, setGoal] = useState<WaterGoal | null>(null);
  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [slots, setSlots] = useState<WaterSlot[]>([]);
  const [loading, setLoading] = useState(true);

  // Goal & Slots settings states
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [targetInput, setTargetInput] = useState(2000);
  const [slotsInput, setSlotsInput] = useState<string[]>([]);
  const [newTimeInput, setNewTimeInput] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  async function loadData() {
    try {
      const res = await fetch("/api/water");
      const data = await res.json();
      setGoal(data.goal);
      setLogs(data.logs || []);
      setSlots(data.slots || []);
      if (data.goal) setTargetInput(data.goal.dailyTargetMl);
      if (data.slots) setSlotsInput(data.slots.map((s: any) => s.slotTime));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function logWater(amountMl: number) {
    try {
      await fetch("/api/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountMl }),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteLog(id: string) {
    setDeleteConfirmId(id);
  }

  async function confirmDeleteLog() {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    try {
      const res = await fetch(`/api/water?id=${id}&type=log`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function saveGoal(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fetch("/api/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "goal",
          dailyTargetMl: targetInput,
          slots: slotsInput,
        }),
      });
      setShowGoalModal(false);
      loadData();
    } catch (e) {
      console.error(e);
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

  if (loading) return <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>;

  const todayLogs = logs.filter(l => isSameDay(parseISO(l.loggedAt), new Date()));
  const currentTotal = todayLogs.reduce((acc, l) => acc + l.amountMl, 0);
  const target = goal?.dailyTargetMl || 2000;
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
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center relative group">
          <button 
            onClick={() => {
              setTargetInput(goal?.dailyTargetMl || 2000);
              setSlotsInput(slots.map(s => s.slotTime));
              setShowGoalModal(true);
            }}
            className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-[#A172FD] hover:bg-[#F5F3FF] transition-all active:scale-95"
            title="Thiết lập mục tiêu & nhắc nhở"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          <div className="w-20 h-20 rounded-full bg-[#f0ecff] flex items-center justify-center mb-4 relative overflow-hidden">
             <div className="absolute bottom-0 w-full bg-[#A172FD] opacity-20 transition-all duration-1000" style={{ height: `${progress}%` }}></div>
             <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-[#A172FD] z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
             </svg>
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Đã uống hôm nay</h3>
          <p className="text-3xl font-bold text-gray-800 mt-1">{currentTotal} <span className="text-lg text-gray-500 font-normal">/ {target} ml</span></p>
          <div className="w-full bg-gray-100 rounded-full h-2 mt-4">
            <div className="bg-[#A172FD] h-2 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
          <h3 className="text-gray-800 font-semibold mb-4">Biểu đồ uống nước (7 ngày)</h3>
          <div className="h-[140px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis hide />
                <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="amount" fill="#A172FD" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Water Logging */}
      <div id="tour-water-quick-log" className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <span className="text-gray-700 font-bold text-sm">Ghi nhanh lượng nước:</span>
        <div className="flex gap-2">
          {[100, 200, 250, 350, 500].map(amount => (
            <button 
              key={amount} 
              onClick={() => logWater(amount)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#F5F3FF] text-[#A172FD] hover:bg-[#A172FD] hover:text-white transition-all active:scale-95 shadow-sm border border-[#F0ECFF]"
            >
              +{amount} ml
            </button>
          ))}
        </div>
      </div>

      {/* Main Hydration Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reminder Slots List */}
        <div id="tour-water-slots" className="lg:col-span-2 bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
          <h3 className="text-gray-800 font-semibold mb-4 text-lg">Khung giờ nhắc nhở</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {slots.length === 0 ? (
              <div className="text-center py-8 text-gray-400 col-span-full">
                <p className="text-sm">Chưa thiết lập khung giờ nào.</p>
                <button 
                  onClick={() => setShowGoalModal(true)} 
                  className="mt-2 text-xs font-bold text-[#A172FD] hover:underline"
                >
                  Thiết lập ngay
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
                      : "border-gray-100 hover:border-[#d8b4fe] hover:bg-[#f0ecff]/50"
                  }`}>
                    <div>
                      <p className={`text-xl font-bold transition-colors ${
                        isDrunk ? "text-emerald-700" : "text-gray-700 group-hover:text-[#A172FD]"
                      }`}>{slot.slotTime}</p>
                      <p className="text-sm text-gray-500">{slot.amountMl} ml</p>
                    </div>
                    {isDrunk ? (
                      <span className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold select-none">
                        ✓
                      </span>
                    ) : (
                      <button 
                        onClick={() => logWater(slot.amountMl)}
                        className="w-10 h-10 rounded-full border-2 border-[#e5e7eb] flex items-center justify-center text-transparent hover:border-[#A172FD] hover:text-[#A172FD] hover:bg-[#A172FD]/10 transition-all active:scale-95"
                        title="Đánh dấu đã uống"
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
        <div className="lg:col-span-1 bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex flex-col min-h-[300px]">
          <h3 className="text-gray-800 font-semibold mb-4 text-lg">Nhật ký hôm nay</h3>
          {todayLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-400 flex-1 flex flex-col items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs">Chưa uống nước hôm nay</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1 flex-1">
              {todayLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 hover:bg-[#f0ecff]/40 transition-colors border border-transparent hover:border-[#d8b4fe]">
                  <div className="flex items-center gap-3">
                    <span className="text-xl select-none">💧</span>
                    <div>
                      <p className="font-bold text-gray-700">{log.amountMl} ml</p>
                      <p className="text-[10px] text-gray-400">{format(parseISO(log.loggedAt), "HH:mm")}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteLog(log.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors active:scale-95"
                    title="Xóa lượt uống"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Goal & Slots settings modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-[420px] rounded-[28px] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Thiết lập mục tiêu & Nhắc nhở</h2>
            <form onSubmit={saveGoal} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mục tiêu hàng ngày (ml)</label>
                <input 
                  required 
                  type="number" 
                  min="500" 
                  step="50"
                  value={targetInput} 
                  onChange={e => setTargetInput(Number(e.target.value))} 
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 font-bold outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD]" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Các mốc nhắc giờ uống nước</label>
                <div className="flex gap-2 mb-3">
                  <input 
                    type="time" 
                    value={newTimeInput} 
                    onChange={e => setNewTimeInput(e.target.value)} 
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 font-bold outline-none focus:border-[#A172FD]" 
                  />
                  <button 
                    type="button" 
                    onClick={addSlotTime}
                    className="bg-[#A172FD] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#8b5cf6] transition-colors"
                  >
                    Thêm
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto p-2 bg-gray-50 rounded-2xl border border-gray-100">
                  {slotsInput.length === 0 ? (
                    <span className="text-xs text-gray-400 p-2">Chưa thêm khung giờ nào. Hệ thống sẽ tự tạo 15 mốc đều nhau từ 08:00 - 22:00 nếu để trống.</span>
                  ) : (
                    slotsInput.map(time => (
                      <span key={time} className="flex items-center gap-1 text-xs font-bold bg-purple-50 text-[#A172FD] px-3 py-1.5 rounded-full select-none">
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

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowGoalModal(false)} 
                  className="flex-1 rounded-xl border border-gray-200 py-3 font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="flex-1 rounded-xl bg-[#A172FD] py-3 font-semibold text-white hover:bg-[#8b5cf6] transition-colors shadow-md"
                >
                  Lưu thiết lập
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom delete confirmation modal */}
      {deleteConfirmId && (
        <div 
          onClick={() => setDeleteConfirmId(null)}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-[360px] rounded-[28px] p-6 shadow-2xl border border-gray-100 relative animate-in zoom-in-95 duration-200"
          >
            <button 
              onClick={() => setDeleteConfirmId(null)} 
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex items-center gap-3 mb-4 mt-2">
              <div className="p-3 bg-red-50 text-red-500 rounded-2xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight">
                Xác nhận xóa
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-6 font-semibold">
              Bạn có chắc chắn muốn xóa lượt uống nước này không?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 rounded-xl border border-gray-200 py-3 font-bold text-gray-500 hover:bg-gray-50 transition-colors text-sm"
              >
                Hủy
              </button>
              <button
                onClick={confirmDeleteLog}
                className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 py-3 font-bold text-white transition-colors shadow-md text-sm"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
