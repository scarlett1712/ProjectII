import { useTranslations } from "next-intl";
import { addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from "date-fns";
import { formatDate } from "@/shared/i18n/format";
import { ChevronLeft, ChevronRight, Plus, Trash2, Check, Calendar as CalendarIcon, Pencil } from "lucide-react";
import { Tag } from "@/features/calendar/presentation/types";

interface CalendarSidebarProps {
  currentDate: Date;
  view: "month" | "week" | "day";
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  tags: Tag[];
  hiddenTagIds: string[];
  toggleTagFilter: (id: string) => void;
  onAddTag: () => void;
  onEditTag: (tag: Tag) => void;
  handleDeleteTag: (id: string) => void;
}

export function CalendarSidebar({
  currentDate,
  view,
  setCurrentDate,
  tags,
  hiddenTagIds,
  toggleTagFilter,
  onAddTag,
  onEditTag,
  handleDeleteTag,
}: CalendarSidebarProps) {
  const t = useTranslations("calendar");
  const tc = useTranslations("common");
  const handleDragStartTaskPad = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", "new-task");
  };
  return (
    <aside className="col-span-12 lg:col-span-3 space-y-6 bg-white/60 p-6 rounded-3xl border border-white/20 backdrop-blur-md shadow-sm">
      {/* Navigation Date Picker */}
      <div id="tour-cal-nav" className="text-center">
        <CalendarIcon className="h-10 w-10 text-primary mx-auto mb-2" />
        <h2 className="text-xl font-bold text-gray-800 capitalize">
          {formatDate(currentDate, "MMMM yyyy")}
        </h2>
        <div className="flex justify-center gap-2 mt-3">
          <button
            onClick={() => setCurrentDate(prev => view === "month" ? subMonths(prev, 1) : view === "week" ? subWeeks(prev, 1) : subDays(prev, 1))}
            className="p-2 rounded-full hover:bg-purple-100/50 text-primary transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-1.5 rounded-full bg-primary-soft text-primary font-bold text-xs hover:bg-primary hover:text-white transition-colors"
          >
            {tc("period.today")}
          </button>
          <button
            onClick={() => setCurrentDate(prev => view === "month" ? addMonths(prev, 1) : view === "week" ? addWeeks(prev, 1) : addDays(prev, 1))}
            className="p-2 rounded-full hover:bg-purple-100/50 text-primary transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* DRAGGABLE TASK PAD */}
      <div id="tour-cal-task-pad" className="space-y-3">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{t("sidebar.taskPadTitle")}</h3>
        <p className="text-xs text-gray-500">{t("sidebar.taskPadHint")}</p>
        <div className="flex justify-center py-2">
          <div
            draggable
            onDragStart={handleDragStartTaskPad}
            className="relative cursor-grab active:cursor-grabbing w-36 h-36 bg-note p-4 shadow-md rounded-br-hero border border-yellow-200/50 flex flex-col justify-between hover:shadow-lg transition-all transform hover:scale-105 hover:-rotate-2"
          >
            {/* Paper line lines */}
            <div className="space-y-2">
              <div className="h-1 bg-black/5 rounded w-full" />
              <div className="h-1 bg-black/5 rounded w-5/6" />
              <div className="h-1 bg-black/5 rounded w-4/5" />
            </div>
            <p className="text-2xs font-bold text-note-ink text-center uppercase tracking-wider select-none">
              {t("sidebar.taskPadLabel")}
            </p>
            {/* Peeling corner */}
            <div className="absolute bottom-0 right-0 h-8 w-8 rounded-tl-xl bg-black/5" />
          </div>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* TAG MANAGEMENT */}
      <div id="tour-cal-tags" className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{t("sidebar.tagsTitle")}</h3>
          <button
            onClick={onAddTag}
            className="p-1 rounded-lg bg-purple-50 text-primary hover:bg-primary hover:text-white transition-colors"
            title={t("sidebar.addTag")}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          {tags.map(tag => (
            <div key={tag.id} className="flex items-center justify-between group">
              <button
                onClick={() => toggleTagFilter(tag.id)}
                className="flex-1 flex items-center gap-3 py-1.5 px-2 rounded-xl hover:bg-purple-50/50 text-left transition-colors"
              >
                <span
                  className="w-4 h-4 rounded-full border flex items-center justify-center transition-colors"
                  style={{ borderColor: tag.color, backgroundColor: !hiddenTagIds.includes(tag.id) ? tag.color : "transparent" }}
                >
                  {!hiddenTagIds.includes(tag.id) && <Check className="h-2.5 w-2.5 text-white" />}
                </span>
                <span className="text-sm font-bold text-gray-700">{tag.name}</span>
              </button>

              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-all">
                {/* Edit button — available for all tags including system ones */}
                <button
                  onClick={() => onEditTag(tag)}
                  className="p-1 text-gray-400 hover:text-primary rounded-lg hover:bg-purple-50 transition-all"
                  title={t("sidebar.editTag")}
                >
                  <Pencil className="h-3 w-3" />
                </button>
                {/* Delete button — only for non-system tags */}
                {!tag.isSystem && (
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"
                    title={t("sidebar.deleteTag")}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
