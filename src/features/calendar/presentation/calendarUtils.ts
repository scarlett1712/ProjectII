import type { TourStep } from "@/shared/ui/OnboardingTour";
import { HOUR_ROW_PX } from "./timeGrid";
import type { useTranslations } from "next-intl";

/** Calendar tour steps. The translator uses the calendar namespace. */
export const getCalendarSteps = (t: ReturnType<typeof useTranslations<"calendar">>): TourStep[] => [
  {
    selector: "#tour-cal-nav",
    title: t("tour.nav.title"),
    content: t("tour.nav.content"),
  },
  {
    selector: "#tour-cal-task-pad",
    title: t("tour.taskPad.title"),
    content: t("tour.taskPad.content"),
  },
  {
    selector: "#tour-cal-tags",
    title: t("tour.tags.title"),
    content: t("tour.tags.content"),
  },
  {
    selector: "#tour-cal-views",
    title: t("tour.views.title"),
    content: t("tour.views.content"),
  }
];

export { boldColors, pastelColors } from "@/shared/theme/palettes";

/** Position within the hour column. Left and width are percentages, top and height are pixels. */
export interface EventLayout {
  left: string;
  width: string;
  top: number;
  height: number;
  visible: boolean;
}

/** Fallback position for an item missing from the computed layout. */
export const DEFAULT_EVENT_LAYOUT: EventLayout = { left: "0%", width: "98%", top: 0, height: HOUR_ROW_PX, visible: true };

// Helper function to calculate side-by-side positioning for overlapping events
export const getEventLayoutStyles = (dayItems: any[], day: Date, hiddenHours: number[] = []) => {
  // 1. Map each item to its start and end hour
  const itemsWithHours = dayItems.map(item => {
    const start = new Date(item.startAt);
    const end = new Date(item.endAt || item.startAt);
    let startHour = 0;
    let endHour = 24;
    
    const isSameDayLocal = (d1: Date, d2: Date) => {
      return d1.getFullYear() === d2.getFullYear() &&
             d1.getMonth() === d2.getMonth() &&
             d1.getDate() === d2.getDate();
    };

    if (isSameDayLocal(start, day)) {
      startHour = start.getHours() + start.getMinutes() / 60;
    }
    if (isSameDayLocal(end, day)) {
      endHour = end.getHours() + end.getMinutes() / 60;
    } else if (item.isTask) {
      endHour = startHour + 1.0;
    }
    
    if (endHour <= startHour) {
      endHour = startHour + 1.0;
    }
    
    // calculate top and height taking hiddenHours into account
    let top = 0;
    const startHourFloor = Math.floor(startHour);
    for (let h = 0; h < startHourFloor; h++) {
      if (!hiddenHours.includes(h)) {
        top += HOUR_ROW_PX;
      }
    }
    if (!hiddenHours.includes(startHourFloor)) {
      const fraction = startHour - startHourFloor;
      top += fraction * HOUR_ROW_PX;
    }

    let height = 0;
    const startFloor = Math.floor(startHour);
    const endCeil = Math.ceil(endHour);
    for (let h = startFloor; h < endCeil; h++) {
      if (!hiddenHours.includes(h)) {
        const overlapStart = Math.max(startHour, h);
        const overlapEnd = Math.min(endHour, h + 1);
        const overlap = overlapEnd - overlapStart;
        if (overlap > 0) {
          height += overlap * HOUR_ROW_PX;
        }
      }
    }
    height = Math.max(15, height); // ensure minimum height
    const visible = !hiddenHours.includes(startHourFloor);

    return {
      item,
      startHour,
      endHour,
      top,
      height,
      visible
    };
  });

  // 2. Sort by startHour, then by duration descending
  itemsWithHours.sort((a, b) => {
    if (a.startHour !== b.startHour) return a.startHour - b.startHour;
    return (b.endHour - b.startHour) - (a.endHour - a.startHour);
  });

  // 3. Find overlapping groups (clusters)
  const clusters: (typeof itemsWithHours[number])[][] = [];
  itemsWithHours.forEach(item => {
    let added = false;
    for (const cluster of clusters) {
      const overlaps = cluster.some(cItem => 
        item.startHour < cItem.endHour && item.endHour > cItem.startHour
      );
      if (overlaps) {
        cluster.push(item);
        added = true;
        break;
      }
    }
    if (!added) {
      clusters.push([item]);
    }
  });

  // 4. For each cluster, assign columns
  const layoutStyles: Record<string, EventLayout> = {};
  clusters.forEach(cluster => {
    const columns: (typeof itemsWithHours[number])[][] = [];
    cluster.forEach(item => {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const overlaps = col.some(cItem => 
          item.startHour < cItem.endHour && item.endHour > cItem.startHour
        );
        if (!overlaps) {
          col.push(item);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([item]);
      }
    });

    const colCount = columns.length;
    columns.forEach((col, colIndex) => {
      col.forEach(item => {
        const widthPercent = 100 / colCount;
        const leftPercent = colIndex * widthPercent;
        layoutStyles[item.item.id] = {
          left: `${leftPercent}%`,
          width: `${widthPercent - 2}%`,
          top: item.top,
          height: item.height,
          visible: item.visible
        };
      });
    });
  });

  return layoutStyles;
};
