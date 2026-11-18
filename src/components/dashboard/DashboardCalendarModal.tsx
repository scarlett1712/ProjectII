"use client";

import { motion } from "framer-motion";
import { X, ChevronDown, Bell, BellOff } from "lucide-react";
import { registerPushSubscription } from "@/lib/clientNotifications";

interface TagItem {
  id: string;
  name: string;
  color: string;
  isSystem: boolean;
}

interface DashboardCalendarModalProps {
  showCalendarModal: boolean;
  setShowCalendarModal: (val: boolean) => void;
  handleSaveCalendarItem: (e: React.FormEvent) => void;

  itemType: "event" | "task";
  setItemType: (val: "event" | "task") => void;
  calTitle: string;
  setCalTitle: (val: string) => void;
  calStartAtStr: string;
  setCalStartAtStr: (val: string) => void;
  calEndAtStr: string;
  setCalEndAtStr: (val: string) => void;

  calSelectedTagId: string;
  setCalSelectedTagId: (val: string) => void;
  calendarTags: TagItem[];
  calTagDropdownOpen: boolean;
  setCalTagDropdownOpen: (val: boolean) => void;
  getTagStyles: (color: string) => { backgroundColor: string; color: string; border: string };

  calRecurrence: string;
  setCalRecurrence: (val: string) => void;
  calRecurrenceEndStr: string;
  setCalRecurrenceEndStr: (val: string) => void;

  calNotification: boolean;
  setCalNotification: (val: boolean) => void;
  calNoteColor: string;
  setCalNoteColor: (val: string) => void;
  calDescription: string;
  setCalDescription: (val: string) => void;

  boldColors: string[];
  pastelColors: string[];
  isSubmitting: boolean;
}

export function DashboardCalendarModal({
  showCalendarModal,
  setShowCalendarModal,
  handleSaveCalendarItem,

  itemType,
  setItemType,
  calTitle,
  setCalTitle,
  calStartAtStr,
  setCalStartAtStr,
  calEndAtStr,
  setCalEndAtStr,

  calSelectedTagId,
  setCalSelectedTagId,
  calendarTags,
  calTagDropdownOpen,
  setCalTagDropdownOpen,
  getTagStyles,

  calRecurrence,
  setCalRecurrence,
  calRecurrenceEndStr,
  setCalRecurrenceEndStr,

  calNotification,
  setCalNotification,
  calNoteColor,
  setCalNoteColor,
  calDescription,
  setCalDescription,

  boldColors,
  pastelColors,
  isSubmitting,
}: DashboardCalendarModalProps) {
  if (!showCalendarModal) return null;

  return (
    <div
      onClick={() => { setShowCalendarModal(false); }}
      className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 backdrop-blur-md p-3 sm:p-4 overflow-y-auto overscroll-contain"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-full max-w-[500px] rounded-[28px] sm:rounded-[32px] p-5 sm:p-8 shadow-2xl border border-gray-100 my-auto max-h-[85dvh] sm:max-h-none overflow-y-auto sm:overflow-visible overscroll-contain pb-12 sm:pb-8 scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-[#A172FD]">Tạo công việc/lịch trình</h3>
          <button
            onClick={() => { setShowCalendarModal(false); }}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
            aria-label="Đóng tạo lịch trình"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSaveCalendarItem} className="space-y-5">
          {/* Event/Task Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-[#F5F3FF] p-1 rounded-xl text-sm font-bold">
            <button
              type="button"
              onClick={() => {
                setItemType("event");
                setCalSelectedTagId("system-event");
                setCalNotification(false);
              }}
              className={`py-2 rounded-lg text-center transition-all ${itemType === "event" ? "bg-[#A172FD] text-white shadow-sm" : "text-[#6B7280]"}`}
            >
              Lịch cố định
            </button>
            <button
              type="button"
              onClick={() => {
                setItemType("task");
                setCalSelectedTagId("");
                setCalNotification(calStartAtStr !== "");
              }}
              className={`py-2 rounded-lg text-center transition-all ${itemType === "task" ? "bg-[#A172FD] text-white shadow-sm" : "text-[#6B7280]"}`}
            >
              Nhiệm vụ (Task)
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Tiêu đề</label>
            <input
              required
              type="text"
              value={calTitle}
              onChange={e => setCalTitle(e.target.value)}
              placeholder="Nhập tiêu đề..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD]"
            />
          </div>

          {/* Time Range */}
          <div className="w-full min-w-0">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              {itemType === "event" ? "Bắt đầu" : "Thời hạn (Không bắt buộc)"}
            </label>
            <input
              required={itemType === "event"}
              type="datetime-local"
              value={calStartAtStr}
              onChange={e => {
                const val = e.target.value;
                setCalStartAtStr(val);
                if (itemType === "task") {
                  setCalNotification(val !== "");
                  if (val !== "" && typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
                    Notification.requestPermission().then((res) => {
                      if (res === "granted") registerPushSubscription();
                    });
                  }
                }
              }}
              className="w-full min-w-0 max-w-full block rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD] box-border"
              style={{ width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", WebkitAppearance: "none", appearance: "none" }}
            />
          </div>

          {itemType === "event" && (
            <div className="w-full min-w-0">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Kết thúc</label>
              <input
                required
                type="datetime-local"
                value={calEndAtStr}
                onChange={e => setCalEndAtStr(e.target.value)}
                className="w-full min-w-0 max-w-full block rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD] box-border"
                style={{ width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", WebkitAppearance: "none", appearance: "none" }}
              />
            </div>
          )}

          {/* Classification Tag */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Phân loại nhãn</label>
            <div className="relative">
              {/* Trigger Button */}
              <button
                type="button"
                onClick={() => setCalTagDropdownOpen(!calTagDropdownOpen)}
                className="flex items-center justify-between w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD] text-left"
                aria-label="Chọn nhãn"
              >
                {(() => {
                  const selectedTag = calendarTags.find((t) => t.id === calSelectedTagId);
                  if (selectedTag) {
                    const styles = getTagStyles(selectedTag.color);
                    return (
                      <span
                        className="inline-block px-3 py-1 rounded-full text-xs font-bold font-sans"
                        style={{
                          backgroundColor: styles.backgroundColor,
                          color: styles.color,
                          border: styles.border,
                        }}
                      >
                        {selectedTag.name} {selectedTag.isSystem ? "(Mặc định)" : "(Custom)"}
                      </span>
                    );
                  }
                  return <span className="text-gray-400 font-bold text-xs">-- Không gán nhãn --</span>;
                })()}
                <ChevronDown className="h-4 w-4 text-[#A172FD] shrink-0 ml-2" />
              </button>

              {/* Backdrop for click-outside */}
              {calTagDropdownOpen && (
                <div
                  className="fixed inset-0 z-[240]"
                  onClick={() => setCalTagDropdownOpen(false)}
                />
              )}

              {/* Dropdown Options List */}
              {calTagDropdownOpen && (
                <div className="absolute z-[250] mt-1.5 w-full bg-white border border-gray-100 rounded-2xl shadow-xl p-2 max-h-[200px] overflow-y-auto overscroll-contain space-y-1 scrollbar-thin">
                  <button
                    type="button"
                    onClick={() => {
                      setCalSelectedTagId("");
                      setCalNoteColor("#fdfd96");
                      setCalTagDropdownOpen(false);
                    }}
                    className="w-full text-left p-2 hover:bg-purple-50/50 rounded-xl transition-colors flex items-center"
                  >
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold font-sans bg-gray-100 text-gray-500 border border-gray-200">
                      -- Không gán nhãn --
                    </span>
                  </button>
                  {calendarTags.map((t) => {
                    const styles = getTagStyles(t.color);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setCalSelectedTagId(t.id);
                          setCalNoteColor(t.color);
                          setCalTagDropdownOpen(false);
                        }}
                        className="w-full text-left p-2 hover:bg-purple-50/50 rounded-xl transition-colors flex items-center"
                      >
                        <span
                          className="inline-block px-3 py-1 rounded-full text-xs font-bold font-sans"
                          style={{
                            backgroundColor: styles.backgroundColor,
                            color: styles.color,
                            border: styles.border,
                          }}
                        >
                          {t.name} {t.isSystem ? "(Mặc định)" : "(Custom)"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recurrence Options */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Lặp lại</label>
            <select
              value={calRecurrence}
              onChange={e => {
                const val = e.target.value;
                setCalRecurrence(val);
                if (val !== "NONE" && !calRecurrenceEndStr) {
                  const defaultEnd = new Date();
                  defaultEnd.setMonth(defaultEnd.getMonth() + 1);
                  defaultEnd.setHours(23, 59, 0, 0);
                  const offset = defaultEnd.getTimezoneOffset();
                  const local = new Date(defaultEnd.getTime() - offset * 60 * 1000);
                  setCalRecurrenceEndStr(local.toISOString().slice(0, 16));
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

          {calRecurrence !== "NONE" && (
            <div className="w-full min-w-0">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Kết thúc lặp</label>
              <input
                type="datetime-local"
                value={calRecurrenceEndStr}
                onChange={e => {
                  let val = e.target.value;
                  if (val && val.includes("T")) {
                    const [date, time] = val.split("T");
                    if (time === "00:00") {
                      val = `${date}T23:59`;
                    }
                  }
                  setCalRecurrenceEndStr(val);
                }}
                className="w-full min-w-0 max-w-full block rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD] box-border"
                style={{ width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", WebkitAppearance: "none", appearance: "none" }}
              />
            </div>
          )}

          {/* Options: Notification & Note Color */}
          <div className="flex items-center justify-between py-2 border-y border-gray-50">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Thông báo (Windows + Chatbot)</span>
              <button
                type="button"
                onClick={() => {
                  const nextVal = !calNotification;
                  setCalNotification(nextVal);
                  if (nextVal && typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
                    Notification.requestPermission().then((res) => {
                      if (res === "granted") registerPushSubscription();
                    });
                  }
                }}
                className={`p-2 rounded-xl transition-all ${calNotification ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-400"}`}
                title={calNotification ? "Bật thông báo" : "Tắt thông báo"}
                aria-label={calNotification ? "Bật thông báo" : "Tắt thông báo"}
              >
                {calNotification ? <Bell className="h-5 w-5 animate-bounce" /> : <BellOff className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Unified Premium Color Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Màu sắc giấy note / sự kiện</label>
            <div className="space-y-3">
              <div>
                <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Màu đậm</span>
                <div className="flex flex-wrap gap-1.5">
                  {boldColors.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCalNoteColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        calNoteColor === c ? "border-[#A172FD] scale-110 shadow-sm" : "border-transparent hover:scale-105"
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
                      onClick={() => setCalNoteColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        calNoteColor === c ? "border-[#A172FD] scale-110 shadow-sm" : "border-transparent hover:scale-105"
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
                      value={calNoteColor || "#fdfd96"}
                      onChange={(e) => setCalNoteColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      aria-label="Bảng chọn màu tùy ý"
                    />
                    <span className="text-[10px] font-black text-white pointer-events-none drop-shadow-sm">+</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-gray-500 uppercase">{calNoteColor || "#fdfd96"}</span>
                  <div 
                    className="w-5 h-5 rounded-full border border-gray-100 shadow-inner"
                    style={{ backgroundColor: calNoteColor || "#fdfd96" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notes/Description */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Ghi chú</label>
            <textarea
              value={calDescription}
              onChange={e => setCalDescription(e.target.value)}
              placeholder="Thêm mô tả..."
              className="w-full h-24 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-800 outline-none focus:border-[#A172FD] resize-none"
            />
          </div>

          {/* Form Buttons */}
          <div className="flex gap-3 pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 rounded-xl bg-[#A172FD] py-4 text-sm font-bold text-white transition-all shadow-lg ${
                isSubmitting ? "opacity-60 cursor-not-allowed" : "hover:bg-[#8b5cf6]"
              }`}
            >
              {isSubmitting ? "Đang lưu..." : "Lưu lịch trình"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
