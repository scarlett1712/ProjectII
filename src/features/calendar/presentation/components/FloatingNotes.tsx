import { useTranslations } from "next-intl";
import { notifyDataChanged } from "@/shared/client/cacheSync";
import { apiErrorMessage } from "@/shared/client/api";
import { CalendarItem } from "@/features/calendar/presentation/types";
import { calendarTaskBackground, contrastTextColor } from "@/features/calendar/presentation/taskNoteColors";
import { useTaskPositions } from "@/features/calendar/presentation/components/useTaskPositions";
import { useCompleteTask } from "@/features/calendar/presentation/components/useCompleteTask";
import { FloatingTaskNote } from "@/features/calendar/presentation/components/FloatingTaskNote";

interface FloatingNotesProps {
  items: CalendarItem[];
  taskPositions: ReturnType<typeof useTaskPositions>;
  hiddenId: string | undefined;
  openEditPopup: (item: CalendarItem) => void;
  loadData: () => void;
  showToast: (msg: string) => void;
  showError: (msg: string) => void;
}

export function FloatingNotes({
  items,
  taskPositions,
  hiddenId,
  openEditPopup,
  loadData,
  showToast,
  showError,
}: FloatingNotesProps) {
  const tc = useTranslations("common");
  /** Complete and unpin the task, remove its series position and notify other screens. */
  const completeFloatingTask = useCompleteTask<CalendarItem>(
    (task) => {
      taskPositions.remove(task.id, { withSeries: true });
      showToast(tc("schedule.completedNotice", { title: task.title }));
      notifyDataChanged("tasks");
      loadData();
    },
    (e) => showError(apiErrorMessage(e, tc("schedule.completeFailed"))),
  );
  return (
    <>
      {items
        .filter((item) => item.isTask && !item.completed && taskPositions.isFloating(item.id))
        .map((task) => {
          const background = calendarTaskBackground(task);
          return (
            <FloatingTaskNote
              key={task.id}
              task={task}
              position={taskPositions.positionOf(task.id)}
              backgroundColor={background}
              textColor={contrastTextColor(background)}
              hidden={hiddenId === task.id}
              onMove={(offset) => taskPositions.movePosition(task.id, offset)}
              onOpen={() => openEditPopup(task)}
              onComplete={() => void completeFloatingTask(task)}
              onUnpin={() => {
                taskPositions.remove(task.id);
                showToast(tc("schedule.removedFromScreen"));
              }}
            />
          );
        })}
    </>
  );
}
