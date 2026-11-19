"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { registerPushSubscription } from "@/lib/clientNotifications";
import { ModalPortal } from "@/components/ModalPortal";

interface TaskFormState {
  title: string;
  dueAt: string;
  description: string;
}

interface TagItem {
  id: string;
  name: string;
  color: string;
  isSystem: boolean;
}

interface DashboardNoteModalProps {
  showAddNote: boolean;
  setShowAddNote: (val: boolean) => void;
  editingTask: any | null;
  setEditingTask: (val: any | null) => void;
  taskForm: TaskFormState;
  setTaskForm: (val: TaskFormState) => void;
  notify: boolean;
  setNotify: (val: boolean) => void;
  taskRecurrence: string;
  setTaskRecurrence: (val: string) => void;
  taskRecurrenceEnd: string;
  setTaskRecurrenceEnd: (val: string) => void;
  taskFormTagId: string;
  setTaskFormTagId: (val: string) => void;
  taskFormColor: string;
  setTaskFormColor: (val: string) => void;
  calendarTags: TagItem[];
  boldColors: string[];
  pastelColors: string[];
  handleDeleteTask: () => void;
  handleSaveTask: () => void;
  isSubmitting: boolean;
}

export function DashboardNoteModal({
  showAddNote,
  setShowAddNote,
  editingTask,
  setEditingTask,
  taskForm,
  setTaskForm,
  notify,
  setNotify,
  taskRecurrence,
  setTaskRecurrence,
  taskRecurrenceEnd,
  setTaskRecurrenceEnd,
  taskFormTagId,
  setTaskFormTagId,
  taskFormColor,
  setTaskFormColor,
  calendarTags,
  boldColors,
  pastelColors,
  handleDeleteTask,
  handleSaveTask,
  isSubmitting,
}: DashboardNoteModalProps) {
  if (!showAddNote) return null;

  return (
    <ModalPortal>
      <div
        onClick={() => { setShowAddNote(false); setEditingTask(null); }}
        className="fixed inset-0 z-[250] flex items-center justify-center bg-black/40 backdrop-blur-md p-3 sm:p-4 overscroll-contain"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white w-full max-w-[500px] rounded-[28px] sm:rounded-[32px] p-5 sm:p-8 shadow-2xl border border-gray-100 my-auto max-h-[85dvh] overflow-y-auto overscroll-contain pb-12 sm:pb-8 scrollbar-thin"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-[#A172FD]">
            {editingTask ? "Sửa công việc" : "Thêm việc mới"}
          </h3>
          <button
            onClick={() => { setShowAddNote(false); setEditingTask(null); }}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
            aria-label="Đóng thêm công việc"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Tiêu đề</label>
            <input
              required
              type="text"
              value={taskForm.title}
              onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
              placeholder="Ghi chú gì đó..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD]"
            />
          </div>

          {/* Time & Notify */}
          <div className="w-full min-w-0">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Thời hạn (Không bắt buộc)</label>
            <input
              type="datetime-local"
              value={taskForm.dueAt}
              onChange={e => {
                const val = e.target.value;
                setTaskForm({ ...taskForm, dueAt: val });
                setNotify(val !== "");
                if (val !== "" && typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
                  Notification.requestPermission().then((res) => {
                    if (res === "granted") registerPushSubscription();
                  });
                }
              }}
              className="w-full min-w-0 max-w-full block rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD] box-border"
              style={{ width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", WebkitAppearance: "none", appearance: "none" }}
            />
          </div>

          <div className="flex items-center justify-between py-2 border-y border-gray-50">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Thông báo (Điện thoại + Máy tính)</span>
            <div
              onClick={() => {
                const nextVal = !notify;
                setNotify(nextVal);
                if (nextVal && typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
                  Notification.requestPermission().then((res) => {
                    if (res === "granted") registerPushSubscription();
                  });
                }
              }}
              className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${notify ? 'bg-[#A172FD]' : 'bg-black/10'}`}
              role="switch"
              aria-checked={notify}
              aria-label="Bật tắt thông báo"
            >
              <motion.div
                className="absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow-sm"
                animate={{ x: notify ? 20 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </div>
          </div>

          {/* Recurrence Options */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Lặp lại</label>
            <select
              value={taskRecurrence}
              onChange={e => {
                const val = e.target.value;
                setTaskRecurrence(val);
                if (val !== "NONE" && !taskRecurrenceEnd) {
                  const defaultEnd = new Date();
                  defaultEnd.setMonth(defaultEnd.getMonth() + 1);
                  defaultEnd.setHours(23, 59, 0, 0);
                  const offset = defaultEnd.getTimezoneOffset();
                  const local = new Date(defaultEnd.getTime() - offset * 60 * 1000);
                  setTaskRecurrenceEnd(local.toISOString().slice(0, 16));
                }
              }}
              className="w-full block rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD]"
              style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}
            >
              <option value="NONE">Không lặp</option>
              <option value="DAILY">Hàng ngày</option>
              <option value="WEEKLY">Hàng tuần</option>
              <option value="MONTHLY">Hàng tháng</option>
            </select>
          </div>

          {taskRecurrence !== "NONE" && (
            <div className="w-full min-w-0">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Kết thúc lặp</label>
              <input
                type="datetime-local"
                value={taskRecurrenceEnd}
                onChange={e => {
                  let val = e.target.value;
                  if (val && val.includes("T")) {
                    const [date, time] = val.split("T");
                    if (time === "00:00") {
                      val = `${date}T23:59`;
                    }
                  }
                  setTaskRecurrenceEnd(val);
                }}
                className="w-full min-w-0 max-w-full block rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD] box-border"
                style={{ width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", WebkitAppearance: "none", appearance: "none" }}
              />
            </div>
          )}

          {/* Classification Tag */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Phân loại nhãn</label>
            <select
              value={taskFormTagId}
              onChange={e => {
                const val = e.target.value;
                setTaskFormTagId(val);
                const tag = calendarTags.find(t => t.id === val);
                if (tag) {
                  setTaskFormColor(tag.color);
                } else {
                  setTaskFormColor("#fdfd96");
                }
              }}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD]"
            >
              <option value="">-- Không gán nhãn --</option>
              {calendarTags.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.isSystem ? "Mặc định" : "Custom"})</option>
              ))}
            </select>
          </div>

          {/* Unified Premium Color Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Màu sắc giấy note</label>
            <div className="space-y-3">
              <div>
                <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Màu đậm</span>
                <div className="flex flex-wrap gap-1.5">
                  {boldColors.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setTaskFormColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        taskFormColor === c ? "border-[#A172FD] scale-110 shadow-sm" : "border-transparent hover:scale-105"
                      }`}
                      aria-label={`Chọn màu ${c}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Màu pastel</span>
                <div className="flex flex-wrap gap-1.5">
                  {pastelColors.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setTaskFormColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        taskFormColor === c ? "border-[#A172FD] scale-110 shadow-sm" : "border-transparent hover:scale-105"
                      }`}
                      aria-label={`Chọn màu pastel ${c}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tự chọn màu</span>
                <div className="flex items-center gap-2">
                  <div 
                    className="relative w-6 h-6 rounded-full border border-gray-200 overflow-hidden cursor-pointer bg-gradient-to-tr from-red-400 via-green-400 to-blue-400 flex items-center justify-center group hover:scale-105 transition-transform"
                    title="Chọn màu tùy ý"
                  >
                    <input
                      type="color"
                      value={taskFormColor || "#fdfd96"}
                      onChange={(e) => setTaskFormColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      aria-label="Bảng chọn màu tùy ý"
                    />
                    <span className="text-[10px] font-black text-white pointer-events-none drop-shadow-sm">+</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-gray-500 uppercase">{taskFormColor || "#fdfd96"}</span>
                  <div 
                    className="w-5 h-5 rounded-full border border-gray-100 shadow-inner"
                    style={{ backgroundColor: taskFormColor || "#fdfd96" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notes/Description */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Ghi chú</label>
            <textarea
              value={taskForm.description}
              onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
              placeholder="Nội dung ghi chú..."
              className="w-full h-24 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-800 outline-none focus:border-[#A172FD] resize-none"
            />
          </div>

          {/* Form Buttons */}
          <div className="flex gap-3 pt-3">
            {editingTask && (
              <button
                type="button"
                onClick={handleDeleteTask}
                className="px-6 py-3.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors font-bold text-sm"
              >
                Xóa
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveTask}
              disabled={isSubmitting}
              className={`flex-1 rounded-xl bg-[#A172FD] py-3.5 font-bold text-white transition-all shadow-md text-sm ${
                isSubmitting ? "opacity-60 cursor-not-allowed" : "hover:bg-[#8b5cf6]"
              }`}
            >
              {isSubmitting ? "Đang lưu..." : "Lưu Note"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
    </ModalPortal>
  );
}
