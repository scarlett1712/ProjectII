import { useTranslations } from "next-intl";
import { StickyNote } from "lucide-react";
import { darkenedTextColor } from "@/shared/theme/colorMath";
import { dashboardTaskBackground } from "@/features/calendar/presentation/taskNoteColors";
import { useTaskPositions } from "@/features/calendar/presentation/components/useTaskPositions";
import { InlineTaskNote } from "@/features/dashboard/presentation/components/InlineTaskNote";
import type { DashboardTask } from "@/features/dashboard/presentation/useDashboardData";

interface DeadlinesSectionProps {
  inlineTasks: DashboardTask[];
  activeCount: number;
  openEditTask: (task: DashboardTask) => void;
  completeTask: (task: DashboardTask) => void;
  taskPositions: ReturnType<typeof useTaskPositions>;
}

export function DeadlinesSection({
  inlineTasks,
  activeCount,
  openEditTask,
  completeTask,
  taskPositions,
}: DeadlinesSectionProps) {
  const t = useTranslations("dashboard");
  return (
    <div className="col-span-1 xl:col-span-8">
      <section id="tour-deadlines" className="@container min-h-full rounded-4xl bg-white p-5 sm:p-6 shadow-sm flex flex-col">
        <div className="mb-3 sm:mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-primary">{t("deadlines.title")}</h2>
        </div>
        <div className="flex-1 flex items-center justify-center w-full my-auto py-2">
          {inlineTasks.length > 0 ? (
            <div className={`w-full overflow-x-auto pb-3 pt-1 px-1 flex gap-3.5 sm:gap-4 items-center scrollbar-thin ${
              inlineTasks.length <= 3 ? "justify-center" : "justify-start"
            }`}>
              {inlineTasks.map((task) => {
                const background = dashboardTaskBackground(task);
                return (
                  <InlineTaskNote
                    key={task.id}
                    task={task}
                    backgroundColor={background}
                    textColor={darkenedTextColor(background)}
                    onOpen={() => openEditTask(task)}
                    onComplete={() => void completeTask(task)}
                    onFloat={(target, offset) => taskPositions.floatFromDrag(target, offset, task.id, ".dashboard-container")}
                  />
                );
              })}
            </div>
          ) : activeCount > 0 ? (
            <div className="flex h-40 w-full flex-col items-center justify-center text-ink-muted">
              <StickyNote className="mb-2 h-10 w-10 text-primary/40 animate-pulse" />
              <p className="text-xs font-semibold text-primary">{t("deadlines.remaining", { count: String(activeCount) })}</p>
            </div>
          ) : (
            <div className="flex h-40 w-full flex-col items-center justify-center text-ink-muted">
              <StickyNote className="mb-2 h-10 w-10 opacity-20" />
              <p className="text-xs font-medium">{t("deadlines.empty")}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
