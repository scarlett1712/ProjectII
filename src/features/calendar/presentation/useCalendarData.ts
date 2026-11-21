import { useEffect, useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fetchWithCache } from "@/shared/client/cacheSync";
import { isAbortError } from "@/shared/client/api";
import { Tag, CalendarItem } from "@/features/calendar/presentation/types";
import { API_ROUTES, withQuery } from "@/shared/config/routes";
import { useDataSync, useLatestRequest } from "@/shared/client/hooks";
import { applyTagOverrides, readTagOverrides } from "@/features/calendar/presentation/tagOverrides";

export function useCalendarData(currentDate: Date) {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const nextLoadSignal = useLatestRequest();
  const ignoreAbort = (error: unknown) => {
    if (!isAbortError(error)) console.error(error);
  };

  /** Load tags, events around the visible month and tasks. Accept only the latest request. */
  const loadData = async () => {
    const signal = nextLoadSignal();
    try {
      fetchWithCache<Tag[]>(API_ROUTES.tags, { signal }, {
        onData: (data) => setTags(applyTagOverrides(data, readTagOverrides())),
      }).catch(ignoreAbort);

      // Load calendar events
      const startRange = startOfMonth(subMonths(currentDate, 2)).toISOString();
      const endRange = endOfMonth(addMonths(currentDate, 4)).toISOString();
      const calUrl = withQuery(API_ROUTES.calendar, { start: startRange, end: endRange });

      const updateItems = (calList: any[], taskList: any[]) => {
        const formattedTasks = (taskList || []).map((task: any) => ({
          ...task,
          isTask: true,
          startAt: task.dueAt || task.createdAt,
          endAt: task.dueAt || task.createdAt,
          tagId: task.tagId || null
        }));
        setItems([...(calList || []), ...formattedTasks]);
      };

      let currentCal: any[] = [];
      let currentTasks: any[] = [];

      fetchWithCache<any[]>(calUrl, { signal }, {
        onData: (data) => {
          currentCal = data || [];
          updateItems(currentCal, currentTasks);
        },
      }).catch(ignoreAbort);

      fetchWithCache<any[]>(withQuery(API_ROUTES.tasks, { start: startRange, end: endRange }), { signal }, {
        onData: (data) => {
          currentTasks = data || [];
          updateItems(currentCal, currentTasks);
        },
      }).catch(ignoreAbort);

    } catch (e) {
      console.error(e);
    }
  };

  // Reload when the visible month changes. The loaded range already covers several months around it.
  const loadedMonth = format(currentDate, "yyyy-MM");
  useEffect(() => {
    loadData();
  }, [loadedMonth]);

  useDataSync(() => loadData(), { domains: ["calendar", "tasks", "tags"] });
  return { items, tags, setTags, loadData };
}
