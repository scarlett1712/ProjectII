"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import {
  Bell,
  BellOff,
  Search,
  Plus,
  Utensils,
  StickyNote,
  Wallet,
  MoreHorizontal,
  ChevronRight,
  X,
  Check,
  AlertCircle,
  Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { OnboardingTour, TourStep } from "@/components/OnboardingTour";

const dashboardSteps: TourStep[] = [
  {
    selector: "#tour-quick-actions",
    title: "Thanh ghi nhanh tiện lợi",
    content: "Nơi bạn có thể nhanh chóng ghi lại bữa ăn mới, tạo thêm sự kiện lịch trình hoặc ghi nhận các giao dịch chi tiêu/thu nhập hàng ngày.",
  },
  {
    selector: "#tour-deadlines",
    title: "Danh sách Deadline!!!",
    content: "Các ghi chú công việc sắp tới sẽ xuất hiện ở đây dưới dạng các mẫu note xinh xắn. Bạn có thể nhấp vào để chỉnh sửa hoặc click dấu tick để đánh dấu hoàn thành.",
  },
  {
    selector: "#tour-deadlines",
    title: "Ghim note & Kéo thả tự do",
    content: "Đặc biệt, bạn có thể kéo thả tự do các tờ giấy note này ra khỏi danh sách để dính ở bất cứ chỗ nào trên màn hình nền để dễ theo dõi!",
  },
  {
    selector: "#tour-energy-water",
    title: "Theo dõi Dinh dưỡng & Nước",
    content: "Biểu đồ trực quan giúp bạn kiểm soát lượng Calories nạp vào và lượng Nước đã uống trong ngày để duy trì lối sống lành mạnh.",
  },
  {
    selector: "#tour-wallet-chart",
    title: "Thống kê Ví xèng",
    content: "Xem biểu đồ biến động số dư tài chính của bạn trong tuần để có kế hoạch chi tiêu hợp lý hơn.",
  },
  {
    selector: "#tour-user-profile",
    title: "Chỉnh sửa Hồ sơ người dùng",
    content: "Nhấp vào thanh hồ sơ ở góc dưới bên trái để đổi tên hiển thị, cập nhật chiều cao, cân nặng, độ tuổi hoặc Đăng xuất bất cứ lúc nào.",
  },
  {
    selector: "#tour-chatbot-star",
    title: "Trợ lý sức khỏe Bé Sao ⭐",
    content: "Bé Sao có thể chat trò chuyện, giải đáp thắc mắc, tự động ghi chú dựa theo thông tin của bạn và gửi thông báo nhắc lịch học, nhắc uống nước trực tiếp lên màn hình Windows!",
  }
];

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

// Mock data for the chart
const walletData = [
  { name: "Sun", value: 0 },
  { name: "Mon", value: 0 },
  { name: "Tue", value: 0 },
  { name: "Wed", value: 0 },
  { name: "Thu", value: 0 },
  { name: "Fri", value: 0 },
  { name: "Sat", value: 0 },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const draggedTaskIdRef = useRef<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [transactionTab, setTransactionTab] = useState<"chi" | "thu" | "chuyen">("chi");
  const [notify, setNotify] = useState(true);
  const [taskFormTagId, setTaskFormTagId] = useState("system-task");
  const [taskFormColor, setTaskFormColor] = useState("#fdfd96");

  // Calendar event creator states
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarTags, setCalendarTags] = useState<any[]>([]);
  const [itemType, setItemType] = useState<"event" | "task">("event");
  const [calTitle, setCalTitle] = useState("");
  const [calDescription, setCalDescription] = useState("");
  const [calStartAtStr, setCalStartAtStr] = useState("");
  const [calEndAtStr, setCalEndAtStr] = useState("");
  const [calAllDay, setCalAllDay] = useState(false);
  const [calSelectedTagId, setCalSelectedTagId] = useState("system-event");
  const [calNotification, setCalNotification] = useState(true);
  const [calNoteColor, setCalNoteColor] = useState("#fdfd96");
  const [calRecurrence, setCalRecurrence] = useState("NONE");
  const [calRecurrenceEndStr, setCalRecurrenceEndStr] = useState("");
  const [calCompleted, setCalCompleted] = useState(false);

  const presetColors = ["#fdfd96", "#F87171", "#93C5FD", "#A7F3D0", "#F472B6", "#C084FC", "#FB923C"];

  // Real data states
  const [meals, setMeals] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [waterData, setWaterData] = useState<any>({ goal: null, logs: [] });

  const [taskPositions, setTaskPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [editingTask, setEditingTask] = useState<any>(null);

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

  useEffect(() => {
    const saved = localStorage.getItem("dashboard-task-positions");
    if (saved) {
      try {
        setTaskPositions(JSON.parse(saved));
      } catch (e) { }
    }
  }, []);

  const [mealForm, setMealForm] = useState({
    name: "",
    grams: "",
    calories: "",
    category: "Sáng",
    time: "07:00"
  });

  const [taskForm, setTaskForm] = useState({
    title: "",
    dueAt: "",
    description: ""
  });

  const fetchProfile = () => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => setProfile(data))
      .catch(() => undefined);
  };

  const fetchWater = () => {
    fetch("/api/water")
      .then((res) => res.json())
      .then((data) => setWaterData(data))
      .catch(() => undefined);
  };

  const fetchMeals = () => {
    fetch("/api/meals")
      .then((res) => res.json())
      .then((data) => setMeals(data))
      .catch(() => undefined);
  };

  const fetchTasks = () => {
    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => setTasks(data))
      .catch(() => undefined);
  };

  const fetchTags = () => {
    fetch("/api/tags")
      .then((res) => res.json())
      .then((data) => {
        let overrides: Record<string, { name: string; color: string }> = {};
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("calendar-tag-overrides");
          if (stored) {
            try { overrides = JSON.parse(stored); } catch { }
          }
        }
        const merged = data.map((t: any) => {
          if (t.id.startsWith("system-") && overrides[t.id]) {
            return { ...t, ...overrides[t.id] };
          }
          return t;
        });
        setCalendarTags(merged);
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    fetchTasks();
    fetchMeals();
    fetchProfile();
    fetchWater();
    fetchTags();
  }, []);

  const handleSaveMeal = async () => {
    if (!mealForm.name) return;
    try {
      const eatenAt = new Date();
      const [h, m] = (mealForm.time || "07:00").split(":");
      eatenAt.setHours(Number(h), Number(m), 0, 0);

      await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealName: mealForm.name,
          grams: mealForm.grams === "" ? 0 : Number(mealForm.grams),
          calories: mealForm.calories === "" ? 0 : Number(mealForm.calories),
          note: mealForm.category,
          eatenAt: eatenAt.toISOString()
        }),
      });
      fetchMeals();
      setShowAddMeal(false);
      setMealForm({ name: "", grams: "", calories: "", category: "Sáng", time: "07:00" });
      showToast("Đã lưu bữa ăn mới!");
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveTask = async () => {
    if (!taskForm.title) return;
    try {
      let url = "/api/tasks";
      let method = "POST";
      const payload: any = {
        title: taskForm.title.trim(),
        dueAt: taskForm.dueAt ? new Date(taskForm.dueAt).toISOString() : null, // Optional deadline!
        description: taskForm.description || "",
        notification: notify,
        tagId: taskFormTagId,
        noteColor: taskFormColor,
        color: taskFormColor
      };

      if (editingTask) {
        url = "/api/tasks";
        method = "PATCH";
        payload.id = editingTask.id;
      }

      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      fetchTasks();
      setShowAddNote(false);
      setEditingTask(null);
      setTaskForm({ title: "", dueAt: "", description: "" });
      showToast(editingTask ? "Đã cập nhật công việc!" : "Đã thêm công việc mới!");
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCalendarItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calTitle.trim()) return;

    const payload: any = {
      title: calTitle.trim(),
      description: calDescription.trim(),
      notification: calNotification,
      noteColor: calNoteColor,
      color: calNoteColor,
      tagId: calSelectedTagId
    };

    if (itemType === "event") {
      if (!calStartAtStr || !calEndAtStr) {
        showToast("Vui lòng nhập thời gian bắt đầu và kết thúc!");
        return;
      }
      payload.startAt = new Date(calStartAtStr).toISOString();
      payload.endAt = new Date(calEndAtStr).toISOString();
      payload.allDay = calAllDay;
      payload.recurrence = calRecurrence;
      payload.recurrenceEnd = calRecurrenceEndStr ? new Date(calRecurrenceEndStr).toISOString() : null;
    } else {
      payload.dueAt = calStartAtStr ? new Date(calStartAtStr).toISOString() : null;
      payload.completed = calCompleted;
    }

    try {
      const url = itemType === "event" ? "/api/calendar" : "/api/tasks";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowCalendarModal(false);
        showToast(itemType === "event" ? "Đã tạo lịch trình mới!" : "Đã tạo nhiệm vụ mới!");
        fetchTasks();
      } else {
        const errorData = await res.json();
        showToast(errorData.error || "Gặp lỗi khi tạo.");
      }
    } catch (e) {
      console.error(e);
      showToast("Lỗi máy chủ.");
    }
  };

  const handleDeleteTask = async () => {
    if (!editingTask) return;
    showConfirm(
      "Xóa công việc",
      "Bạn có chắc muốn xóa công việc này không?",
      async () => {
        try {
          const res = await fetch(`/api/tasks?id=${editingTask.id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            setShowAddNote(false);
            setEditingTask(null);
            showToast("Đã xóa công việc thành công.");
            fetchTasks();
          }
        } catch (err) {
          console.error(err);
          showToast("Lỗi khi xóa công việc.");
        }
      }
    );
  };

  // Drag-to-float logic for inline notes
  const handleInlineTaskDragEnd = (e: any, info: any, task: any, containerClass: string) => {
    if (Math.abs(info.offset.x) < 10 && Math.abs(info.offset.y) < 10) {
      return;
    }

    const cardEl = (e.target as HTMLElement).closest('.task-card-ref');
    if (!cardEl) return;
    const rect = cardEl.getBoundingClientRect();

    const parent = document.querySelector(containerClass);
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();

    // Calculate coordinates relative to parent container
    const x = rect.left - parentRect.left;
    const y = rect.top - parentRect.top;

    const updated = {
      ...taskPositions,
      [task.id]: { x, y }
    };
    setTaskPositions(updated);
    localStorage.setItem("dashboard-task-positions", JSON.stringify(updated));
  };

  // Calculations for charts
  const today = new Date().toDateString();

  const todayMeals = meals.filter(m => new Date(m.eatenAt).toDateString() === today);
  const totalCalories = todayMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
  const calorieTarget = profile?.dailyCalories || 2000;
  const caloriePercent = Math.min(100, (totalCalories / calorieTarget) * 100);

  const todayWater = waterData.logs.filter((l: any) => new Date(l.loggedAt).toDateString() === today);
  const totalWater = todayWater.reduce((acc: number, l: any) => acc + (l.amountMl || 0), 0);
  const waterTarget = waterData.goal?.dailyTargetMl || 2000;
  const waterPercent = Math.min(100, (totalWater / waterTarget) * 100);

  const getTaskColor = (dueAt: string | null) => {
    if (!dueAt) return "bg-[#fdfd96]";
    const diff = new Date(dueAt).getTime() - new Date().getTime();
    const hours = diff / (1000 * 60 * 60);
    if (hours < 0) return "bg-[#F87171]";
    if (hours < 2) return "bg-[#F87171]";
    if (hours < 24) return "bg-[#93C5FD]";
    return "bg-[#A7F3D0]";
  };

  const ToggleSwitch = ({ active, onToggle }: { active: boolean; onToggle: () => void }) => (
    <div
      onClick={onToggle}
      className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${active ? 'bg-[#A172FD]' : 'bg-black/10'}`}
    >
      <motion.div
        animate={{ x: active ? 22 : 2 }}
        initial={false}
        className="absolute top-[2px] h-5 w-5 rounded-full bg-white shadow-sm"
      />
    </div>
  );

  // Filter tasks to show inline only if NOT floating and NOT completed
  const inlineTasks = tasks.filter(t => !t.completed && !taskPositions[t.id]).slice(0, 3);
  const floatingTasks = tasks.filter(t => !t.completed && taskPositions[t.id]);

  return (
    <div className="relative space-y-8 min-h-[80vh] dashboard-container">
      {/* Quick Actions Row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Chào mừng trở lại!</h2>
          <p className="text-xs text-gray-500">Hôm nay bạn muốn ghi nhận gì nào?</p>
        </div>
        <div id="tour-quick-actions" className="flex items-center gap-2 bg-white/60 p-2 rounded-2xl border border-white/20 shadow-sm">
          <span className="text-xs font-bold text-[#A172FD] px-2">Ghi nhanh:</span>
          <button
            onClick={() => {
              const now = new Date();
              const hours = now.getHours();
              const minutes = now.getMinutes();
              const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
              let cat = "Vặt";
              if (hours >= 5 && hours < 11) cat = "Sáng";
              else if (hours >= 11 && hours < 15) cat = "Trưa";
              else if (hours >= 17 && hours < 23) cat = "Tối";

              setMealForm({
                name: "",
                grams: "",
                calories: "",
                category: cat,
                time: timeStr
              });
              setShowAddMeal(true);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0ECFF] text-[#A172FD] transition-transform hover:scale-105 active:scale-95 shadow-sm"
            title="Thêm bữa ăn"
          >
            <Utensils className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              setItemType("event");
              setItemType("event");
              setCalTitle("");
              setCalDescription("");
              setCalStartAtStr("");
              setCalEndAtStr("");
              setCalAllDay(false);
              setCalSelectedTagId("system-event");
              setCalNotification(true);
              setCalNoteColor("#fdfd96");
              setCalRecurrence("NONE");
              setCalRecurrenceEndStr("");
              setCalCompleted(false);
              setShowCalendarModal(true);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E0E7FF] text-[#4F46E5] transition-transform hover:scale-105 active:scale-95 shadow-sm"
            title="Thêm lịch trình"
          >
            <Calendar className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowAddTransaction(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DCFCE7] text-[#22C55E] transition-transform hover:scale-105 active:scale-95 shadow-sm"
            title="Thêm giao dịch"
          >
            <Wallet className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 overflow-y-auto pr-4 pb-10">
        {/* Row 1: Deadlines & Nutrition/Water */}
        <div className="col-span-8">
          <section id="tour-deadlines" className="h-full rounded-[32px] bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#A172FD]">Deadline!!!</h2>
            </div>
            <div className="flex flex-wrap gap-4 min-h-[176px]">
              {inlineTasks.length > 0 ? inlineTasks.map((task, i) => (
                <motion.div
                  key={task.id}
                  drag
                  dragMomentum={false}
                  dragElastic={0}
                  onDragStart={() => {
                    draggedTaskIdRef.current = task.id;
                  }}
                  onDragEnd={(e, info) => {
                    handleInlineTaskDragEnd(e, info, task, '.dashboard-container');
                    setTimeout(() => {
                      draggedTaskIdRef.current = null;
                    }, 50);
                  }}
                  onTap={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    if (draggedTaskIdRef.current === task.id) return;
                    setTaskForm({
                      title: task.title,
                      dueAt: task.dueAt ? task.dueAt.slice(0, 16) : "",
                      description: task.description || ""
                    });
                    setNotify(task.notification || false);
                    setTaskFormTagId(task.tagId || "system-task");
                    setTaskFormColor(task.noteColor || task.color || "#fdfd96");
                    setEditingTask(task);
                    setShowAddNote(true);
                  }}
                  initial={{ rotate: -2, scale: 0.95 }}
                  whileHover={{ rotate: 0, scale: 1 }}
                  style={{
                    x: 0,
                    y: 0,
                    backgroundColor: (task.noteColor && !["#fcd34d", "#fdfd96", "#fef3c7"].includes(task.noteColor.toLowerCase())) ? task.noteColor : undefined
                  }} // Reset offset to prevent jumps
                  className={`relative h-44 w-40 p-4 shadow-md ${(task.noteColor && !["#fcd34d", "#fdfd96", "#fef3c7"].includes(task.noteColor.toLowerCase())) ? "" : getTaskColor(task.dueAt)} rounded-br-[40px] transition-all cursor-grab active:cursor-grabbing select-none task-card-ref`}
                >
                  {/* Circle Check Completion Button */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await fetch("/api/tasks", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: task.id, completed: true })
                      });
                      fetchTasks();
                      showToast(`Đã hoàn thành: "${task.title}"!`);
                    }}
                    className="absolute top-3 right-3 p-1 rounded-full bg-black/5 hover:bg-green-500 hover:text-white text-gray-700 transition-colors z-10"
                    title="Hoàn thành"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <p className="font-bold text-gray-900 line-clamp-2">{task.title}</p>
                  <p className="mt-2 text-xs opacity-60">
                    {task.dueAt ? new Date(task.dueAt).toLocaleString("vi-VN", { dateStyle: 'short', timeStyle: 'short' }) : "Không thời hạn"}
                  </p>
                  <div className="absolute bottom-0 right-0 h-10 w-10 rounded-tl-xl bg-black/5" />
                </motion.div>
              )) : (
                <div className="flex h-44 w-full flex-col items-center justify-center text-[#6B7280]">
                  <StickyNote className="mb-2 h-10 w-10 opacity-20" />
                  <p className="text-xs font-medium">Yayyyy không có deadline dí</p>
                </div>
              )}

            </div>
          </section>
        </div>

        <div className="col-span-4">
          <section id="tour-energy-water" className="h-full rounded-[32px] bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#A172FD]">Năng lượng & Nước</h2>
            </div>
            <div className="flex items-center justify-center gap-6">
              {/* Calories Chart */}
              <div className="flex flex-col items-center">
                <p className="mb-4 text-[10px] font-bold text-[#4B5563] uppercase tracking-wider">Calories</p>
                <div className="relative flex h-28 w-28 items-center justify-center">
                  <svg className="h-full w-full -rotate-90">
                    <circle cx="56" cy="56" r="48" stroke="#F5F3FF" strokeWidth="8" fill="transparent" />
                    <circle cx="56" cy="56" r="48" stroke="#A172FD" strokeWidth="8" fill="transparent"
                      strokeDasharray={301} strokeDashoffset={301 - (301 * caloriePercent) / 100} strokeLinecap="round" />
                  </svg>
                  <div className="absolute text-center">
                    <p className="text-xl font-black text-[#581C87]">{totalCalories}</p>
                    <p className="text-[8px] font-bold text-[#4B5563]">kcal</p>
                  </div>
                </div>
              </div>

              {/* Water Chart */}
              <div className="flex flex-col items-center">
                <p className="mb-4 text-[10px] font-bold text-[#4B5563] uppercase tracking-wider">Nước</p>
                <div className="relative flex h-28 w-28 items-center justify-center">
                  <svg className="h-full w-full -rotate-90">
                    <circle cx="56" cy="56" r="48" stroke="#E0F2FE" strokeWidth="8" fill="transparent" />
                    <circle cx="56" cy="56" r="48" stroke="#38BDF8" strokeWidth="8" fill="transparent"
                      strokeDasharray={301} strokeDashoffset={301 - (301 * waterPercent) / 100} strokeLinecap="round" />
                  </svg>
                  <div className="absolute text-center">
                    <p className="text-xl font-black text-[#0369A1]">{totalWater}</p>
                    <p className="text-[8px] font-bold text-[#4B5563]">ml</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid w-full grid-cols-3 gap-2">
              <div className="rounded-2xl bg-[#F5F3FF] p-3 text-center">
                <p className="text-lg font-black text-[#581C87]">0g</p>
                <p className="text-[10px] font-bold text-[#4B5563]">Protein</p>
              </div>
              <div className="rounded-2xl bg-[#F5F3FF] p-3 text-center">
                <p className="text-lg font-black text-[#581C87]">0g</p>
                <p className="text-[10px] font-bold text-[#4B5563]">Carbs</p>
              </div>
              <div className="rounded-2xl bg-[#F5F3FF] p-3 text-center">
                <p className="text-lg font-black text-[#581C87]">0g</p>
                <p className="text-[10px] font-bold text-[#4B5563]">Chất béo</p>
              </div>
            </div>
          </section>
        </div>

        {/* Row 2: Wallet & Meals */}
        <div className="col-span-8">
          <section id="tour-wallet-chart" className="h-full rounded-[32px] bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#A172FD]">Biến động ví xèng</h2>
              <div className="flex rounded-full bg-[#F5F3FF] p-1 text-xs">
                <button className="rounded-full bg-white px-3 py-1 font-bold text-[#A172FD] shadow-sm">Ngày</button>
                <button className="px-3 py-1 font-bold text-[#4B5563] hover:text-[#A172FD]">Tháng</button>
                <button className="px-3 py-1 font-bold text-[#4B5563] hover:text-[#A172FD]">Năm</button>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={walletData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A172FD" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#A172FD" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="value" stroke="#A172FD" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <div className="col-span-4">
          <section className="h-full rounded-[32px] bg-white p-8 shadow-sm min-h-[300px]">
            <h2 className="mb-6 text-xl font-bold text-[#A172FD]">Đã măm măm</h2>
            <div className="space-y-4">
              {todayMeals.slice(0, 3).length > 0 ? todayMeals.slice(0, 3).map((meal, i) => (
                <div key={i} className="flex items-center gap-4 rounded-2xl bg-[#F5F3FF] p-3 transition-transform hover:scale-[1.02]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#A172FD]">
                    <Utensils className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-800">{meal.mealName}</p>
                    <p className="text-xs text-[#6B7280]">
                      {meal.eatenAt ? new Date(meal.eatenAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) : ""}
                    </p>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#A172FD]">
                    {meal.calories > 0 ? `${meal.calories} kcal` : "Tùy chọn"}
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-10 text-[#6B7280]">
                  <Utensils className="mb-2 h-8 w-8 opacity-20" />
                  <p className="text-xs">Chưa có dữ liệu ăn uống hôm nay</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {/* Note Modal */}
        {showAddNote && (
          <div
            onClick={() => { setShowAddNote(false); setEditingTask(null); }}
            className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-[500px] rounded-[32px] p-8 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto scrollbar-thin"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-[#A172FD]">
                  {editingTask ? "Sửa công việc" : "Thêm việc mới"}
                </h3>
                <button
                  onClick={() => { setShowAddNote(false); setEditingTask(null); }}
                  className="p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Thời hạn (Không bắt buộc)</label>
                    <input
                      type="datetime-local"
                      value={taskForm.dueAt}
                      onChange={e => {
                        const val = e.target.value;
                        setTaskForm({ ...taskForm, dueAt: val });
                        setNotify(val !== "");
                        if (val !== "" && typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
                          Notification.requestPermission();
                        }
                      }}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD]"
                    />
                  </div>
                  <div className="flex flex-col justify-end items-start pb-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Thông báo</label>
                    <ToggleSwitch active={notify} onToggle={() => {
                      const nextVal = !notify;
                      setNotify(nextVal);
                      if (nextVal && typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
                        Notification.requestPermission();
                      }
                    }} />
                  </div>
                </div>

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
                      }
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD]"
                  >
                    {calendarTags.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.isSystem ? "Mặc định" : "Custom"})</option>
                    ))}
                  </select>
                </div>

                {/* Pastel Note Color Selector */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Màu sắc giấy note</label>
                  <div className="flex flex-wrap gap-2">
                    {presetColors.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setTaskFormColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-8 h-8 rounded-full border-2 transition-all transform hover:scale-110 flex items-center justify-center ${taskFormColor === c ? "border-[#A172FD]" : "border-transparent"
                          }`}
                      >
                        {taskFormColor === c && <Check className="h-4 w-4 text-gray-700" />}
                      </button>
                    ))}
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
                    className="flex-1 rounded-xl bg-[#A172FD] py-3.5 font-bold text-white hover:bg-[#8b5cf6] transition-colors shadow-md text-sm"
                  >
                    Lưu Note
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Meal Modal */}
      {showAddMeal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 backdrop-blur-md"
          onClick={() => setShowAddMeal(false)}
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
              onClick={() => setShowAddMeal(false)}
              className="absolute top-8 right-8 p-1.5 rounded-xl bg-black/5 hover:bg-black/10 text-gray-700 hover:text-red-500 transition-colors z-10"
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
                  onClick={handleSaveMeal}
                  className="mt-4 block w-full max-w-[240px] mx-auto rounded-full bg-[#A172FD] py-2 text-sm font-bold text-white shadow-lg shadow-[#A172FD]/30 transition-transform hover:scale-105 active:scale-95"
                >
                  Thêm vào thực đơn
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Transaction Modal */}
      {showAddTransaction && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 backdrop-blur-md"
          onClick={() => setShowAddTransaction(false)}
        >
          <motion.div
            initial={{ y: 200, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 200, opacity: 0, scale: 0.9 }}
            className="relative w-full max-w-xl overflow-hidden rounded-[32px] bg-white p-0 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button X */}
            <button
              onClick={() => setShowAddTransaction(false)}
              className="absolute top-6 right-6 p-1.5 rounded-xl bg-black/5 hover:bg-black/10 text-gray-700 hover:text-red-500 transition-colors z-[160]"
            >
              <X className="h-4 w-4" />
            </button>
            {/* Wallet Top Border/Flap */}
            <div className="h-4 bg-[#A172FD]" />
            <div className="flex justify-center">
              <div className="h-6 w-32 rounded-b-2xl bg-[#A172FD] shadow-md" />
            </div>

            <div className="p-10">
              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[#A172FD]">Thêm giao dịch</h2>
                <div className="flex gap-1 bg-[#F5F3FF] p-1 rounded-full">
                  {[
                    { id: "chi", label: "Chi tiêu" },
                    { id: "thu", label: "Thu nhập" },
                    { id: "chuyen", label: "Chuyển khoản" }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTransactionTab(t.id as any)}
                      className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${transactionTab === t.id ? "bg-[#A172FD] text-white shadow-sm" : "text-[#6B7280] hover:text-[#A172FD]"}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-xs font-bold text-[#6B7280] uppercase tracking-wider">Số tiền</label>
                  <div className="flex items-end gap-2 border-b-2 border-[#F5F3FF] pb-2">
                    <span className="text-2xl font-bold text-[#A172FD]">đ</span>
                    <input type="text" placeholder="0" className="w-full bg-transparent text-4xl font-black text-[#A172FD] outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                  {/* Row 1 */}
                  <div>
                    {transactionTab === "chuyen" ? (
                      <>
                        <label className="mb-3 block text-xs font-bold text-[#6B7280] uppercase tracking-wider">Từ tài khoản</label>
                        <select className="w-full rounded-2xl bg-[#F5F3FF] px-4 py-3 text-sm font-bold text-[#4B5563] outline-none appearance-none">
                          <option>Tiền mặt</option>
                          <option>Ví điện tử</option>
                          <option>Ngân hàng</option>
                        </select>
                      </>
                    ) : (
                      <>
                        <label className="mb-3 block text-xs font-bold text-[#6B7280] uppercase tracking-wider">Phân loại</label>
                        <div className="flex h-[44px] flex-wrap gap-2">
                          <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5F3FF] text-[#A172FD] transition-colors hover:bg-[#A172FD] hover:text-white">
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <div>
                    <label className="mb-3 block text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                      {transactionTab === "chuyen" ? "Tới tài khoản" : "Thời gian"}
                    </label>
                    {transactionTab === "chuyen" ? (
                      <select className="w-full rounded-2xl bg-[#F5F3FF] px-4 py-3 text-sm font-bold text-[#4B5563] outline-none appearance-none">
                        <option>Ngân hàng</option>
                        <option>Ví điện tử</option>
                        <option>Tiền mặt</option>
                      </select>
                    ) : (
                      <input type="date" className="w-full rounded-2xl bg-[#F5F3FF] px-4 py-3 text-sm font-bold text-[#4B5563] outline-none" />
                    )}
                  </div>

                  {/* Row 2 */}
                  <div>
                    <label className="mb-3 block text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                      {transactionTab === "chuyen" ? "Thời gian" : "Nguồn tiền"}
                    </label>
                    {transactionTab === "chuyen" ? (
                      <input type="date" className="w-full rounded-2xl bg-[#F5F3FF] px-4 py-3 text-sm font-bold text-[#4B5563] outline-none" />
                    ) : (
                      <select className="w-full rounded-2xl bg-[#F5F3FF] px-4 py-3 text-sm font-bold text-[#4B5563] outline-none appearance-none">
                        <option>Tiền mặt</option>
                        <option>Ví điện tử</option>
                        <option>Ngân hàng</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="mb-3 block text-xs font-bold text-[#6B7280] uppercase tracking-wider">Ghi chú</label>
                    <input type="text" placeholder="Ghi chú gì đó..." className="w-full rounded-2xl bg-[#F5F3FF] px-4 py-3 text-sm font-bold text-[#4B5563] outline-none placeholder:text-[#9CA3AF]" />
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <button
                  onClick={() => setShowAddTransaction(false)}
                  className="w-full rounded-2xl bg-[#A172FD] py-4 font-bold text-white shadow-lg shadow-[#A172FD]/20 transition-transform hover:scale-[1.02] active:scale-95 text-sm"
                >
                  Ghi lại ngay
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Calendar Modal */}
      <AnimatePresence>
        {showCalendarModal && (
          <div
            onClick={() => { setShowCalendarModal(false); }}
            className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-[500px] rounded-[32px] p-8 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto scrollbar-thin"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-[#A172FD]">Tạo công việc/lịch trình</h3>
                <button
                  onClick={() => { setShowCalendarModal(false); }}
                  className="p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
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
                      setCalSelectedTagId("system-task");
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
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
                            Notification.requestPermission();
                          }
                        }
                      }}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD]"
                    />
                  </div>
                  {itemType === "event" && (
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Kết thúc</label>
                      <input
                        required
                        type="datetime-local"
                        value={calEndAtStr}
                        onChange={e => setCalEndAtStr(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD]"
                      />
                    </div>
                  )}
                </div>

                {/* Classification Tag */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Phân loại nhãn</label>
                  <select
                    value={calSelectedTagId}
                    onChange={e => {
                      const val = e.target.value;
                      setCalSelectedTagId(val);
                      const tag = calendarTags.find(t => t.id === val);
                      if (tag) {
                        setCalNoteColor(tag.color);
                      }
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD]"
                  >
                    {calendarTags.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.isSystem ? "Mặc định" : "Custom"})</option>
                    ))}
                  </select>
                </div>

                {/* Event Recurrence Options */}
                {itemType === "event" && (
                  <div className="grid grid-cols-2 gap-4">
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
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD]"
                      >
                        <option value="NONE">Không lặp</option>
                        <option value="DAILY">Hàng ngày</option>
                        <option value="WEEKLY">Hàng tuần</option>
                        <option value="MONTHLY">Hàng tháng</option>
                      </select>
                    </div>
                    {calRecurrence !== "NONE" && (
                      <div>
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
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD]"
                        />
                      </div>
                    )}
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
                          Notification.requestPermission();
                        }
                      }}
                      className={`p-2 rounded-xl transition-all ${calNotification ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-400"}`}
                      title={calNotification ? "Bật thông báo" : "Tắt thông báo"}
                    >
                      {calNotification ? <Bell className="h-5 w-5 animate-bounce" /> : <BellOff className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Pastel Note Color Selector */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Màu sắc giấy note / sự kiện</label>
                  <div className="flex flex-wrap gap-2">
                    {presetColors.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCalNoteColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-8 h-8 rounded-full border-2 transition-all transform hover:scale-110 flex items-center justify-center ${calNoteColor === c ? "border-[#A172FD]" : "border-transparent"
                          }`}
                      >
                        {calNoteColor === c && <Check className="h-4 w-4 text-gray-700" />}
                      </button>
                    ))}
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
                    className="flex-1 rounded-xl bg-[#A172FD] py-4 text-sm font-bold text-white hover:bg-[#8b5cf6] transition-all shadow-lg"
                  >
                    Lưu lịch trình
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING WHITEBOARD CANVAS TASKS */}
      {floatingTasks.map(task => (
        <motion.div
          key={task.id}
          drag
          dragMomentum={false}
          dragElastic={0}
          onDragStart={() => {
            draggedTaskIdRef.current = task.id;
          }}
          onDragEnd={(e, info) => {
            const current = taskPositions[task.id] || { x: 200, y: 100 };
            const updated = {
              ...taskPositions,
              [task.id]: {
                x: current.x + info.offset.x,
                y: current.y + info.offset.y
              }
            };
            setTaskPositions(updated);
            localStorage.setItem("dashboard-task-positions", JSON.stringify(updated));
            setTimeout(() => {
              draggedTaskIdRef.current = null;
            }, 50);
          }}
          onTap={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            if (draggedTaskIdRef.current === task.id) return;
            setTaskForm({
              title: task.title,
              dueAt: task.dueAt ? task.dueAt.slice(0, 16) : "",
              description: task.description || ""
            });
            setNotify(task.notification || false);
            setTaskFormTagId(task.tagId || "system-task");
            setTaskFormColor(task.noteColor || task.color || "#fdfd96");
            setEditingTask(task);
            setShowAddNote(true);
          }} // Use onTap to prevent opening after dragging
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            x: taskPositions[task.id]?.x ?? 200,
            y: taskPositions[task.id]?.y ?? 100,
            zIndex: 100,
            backgroundColor: (task.noteColor && task.noteColor.toLowerCase() !== "#fdfd96") ? task.noteColor : undefined,
          }}
          className={`h-44 w-40 p-4 shadow-xl rounded-br-[40px] border border-black/5 flex flex-col justify-between cursor-grab active:cursor-grabbing select-none ${(task.noteColor && task.noteColor.toLowerCase() !== "#fdfd96") ? "" : "bg-[#fdfd96]"}`}
        >
          {/* Complete Checklist button */}
          <button
            onClick={async (e) => {
              e.stopPropagation();
              await fetch("/api/tasks", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: task.id, completed: true })
              });
              fetchTasks();
              showToast(`Đã hoàn thành: "${task.title}"!`);
            }}
            className="absolute top-2 left-2 p-1 rounded-xl bg-black/5 hover:bg-green-500 hover:text-white text-gray-700 transition-colors z-10"
            title="Hoàn thành"
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const updated = { ...taskPositions };
              delete updated[task.id];
              setTaskPositions(updated);
              localStorage.setItem("dashboard-task-positions", JSON.stringify(updated));
              showToast("Đã gỡ ghi chú khỏi màn hình.");
            }}
            className="absolute top-2 right-2 p-1 rounded-xl bg-black/5 hover:bg-black/10 text-gray-700 hover:text-red-500 transition-colors z-10"
            title="Gỡ khỏi màn hình"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="space-y-1">
            <p className="font-bold text-gray-900 text-sm line-clamp-3 leading-snug">📌 {task.title}</p>
            <p className="text-[10px] text-gray-500 font-bold mt-1">
              {task.dueAt ? new Date(task.dueAt).toLocaleString("vi-VN", { dateStyle: 'short', timeStyle: 'short' }) : "Không thời hạn"}
            </p>
          </div>
          <div className="absolute bottom-0 right-0 h-10 w-10 rounded-tl-xl bg-black/5" />
        </motion.div>
      ))}

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[220] flex items-center gap-3 rounded-2xl bg-white/85 border border-purple-100 p-4 shadow-2xl backdrop-blur-md"
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
            className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
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
      <OnboardingTour pageKey="dashboard" steps={dashboardSteps} />
    </div>
  );
}
