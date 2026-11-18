import type { TourStep } from "@/components/OnboardingTour";

export const calendarSteps: TourStep[] = [
  {
    selector: "#tour-cal-nav",
    title: "Bộ điều hướng thời gian",
    content: "Dễ dàng chuyển đổi giữa các ngày, tuần hoặc tháng để quản lý lịch trình của bạn.",
  },
  {
    selector: "#tour-cal-task-pad",
    title: "Tập giấy Note kéo thả",
    content: "Xé một tờ giấy công việc bằng cách nhấn giữ và kéo thả trực tiếp vào khung giờ trên lịch biểu bên phải để lên lịch thực hiện.",
  },
  {
    selector: "#tour-cal-tags",
    title: "Quản lý nhãn phân loại",
    content: "Thêm hoặc lọc lịch trình theo nhãn màu để giao diện luôn trực quan và gọn gàng.",
  },
  {
    selector: "#tour-cal-views",
    title: "Chế độ xem lịch trình",
    content: "Chuyển đổi linh hoạt giữa xem theo Tháng, Tuần hoặc Ngày phù hợp với nhu cầu theo dõi công việc của bạn.",
  }
];

export const boldColors = [
  "#A172FD", // Violet
  "#3B82F6", // Blue
  "#EC4899", // Pink
  "#F97316", // Orange
  "#10B981", // Green
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#06B6D4", // Turquoise
  "#F59E0B", // Amber/Gold
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#D946EF"  // Fuchsia
];

export const pastelColors = [
  "#C4B5FD", // Lavender Pastel
  "#93C5FD", // Blue Pastel
  "#FBCFE8", // Pink Pastel
  "#FED7AA", // Orange Pastel
  "#A7F3D0", // Green Pastel
  "#FCA5A5", // Red Pastel
  "#E9D5FF", // Purple Pastel
  "#99F6E4", // Teal Pastel
  "#FEF08A", // Yellow Pastel
  "#C7D2FE", // Indigo Pastel
  "#BAE6FD", // Light Blue Pastel
  "#F5D0FE"  // Fuchsia Pastel
];

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
        top += 50;
      }
    }
    if (!hiddenHours.includes(startHourFloor)) {
      const fraction = startHour - startHourFloor;
      top += fraction * 50;
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
          height += overlap * 50;
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
  const layoutStyles: Record<string, { left: string; width: string; top: number; height: number; visible: boolean }> = {};
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

// Helper to ensure readable text color for tags/categories by darkening light colors
export const getContrastTextColor = (hexColor: string) => {
  if (!hexColor) return "#A172FD";
  let cleanHex = hexColor.replace("#", "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split("").map(c => c + c).join("");
  }
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  if (brightness > 150) {
    const factor = 0.55;
    const dr = Math.max(0, Math.min(255, Math.floor(r * factor)));
    const dg = Math.max(0, Math.min(255, Math.floor(g * factor)));
    const db = Math.max(0, Math.min(255, Math.floor(b * factor)));
    return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
  }
  return hexColor;
};

// Helper to ensure readable text color for event cards on pale backgrounds
export const getContrastTextColorForEvent = (hexColor: string) => {
  if (!hexColor) return "#1F2937";
  let cleanHex = hexColor.replace("#", "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split("").map(c => c + c).join("");
  }
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const factor = brightness > 150 ? 0.35 : 0.6;
  const dr = Math.max(0, Math.min(255, Math.floor(r * factor)));
  const dg = Math.max(0, Math.min(255, Math.floor(g * factor)));
  const db = Math.max(0, Math.min(255, Math.floor(b * factor)));
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
};

// Helper to get matching tag styling based on background color brightness
export const getTagStyles = (hexColor: string) => {
  if (!hexColor) return { backgroundColor: "#A172FD15", color: "#A172FD", border: "1px solid rgba(161, 114, 253, 0.3)" };
  let cleanHex = hexColor.replace("#", "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split("").map(c => c + c).join("");
  }
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  if (brightness > 180) {
    const factor = 0.35;
    const dr = Math.max(0, Math.min(255, Math.floor(r * factor)));
    const dg = Math.max(0, Math.min(255, Math.floor(g * factor)));
    const db = Math.max(0, Math.min(255, Math.floor(b * factor)));
    const textColor = `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
    return {
      backgroundColor: hexColor,
      color: textColor,
      border: `1px solid ${textColor}30`
    };
  } else if (brightness > 130) {
    const factor = 0.45;
    const dr = Math.max(0, Math.min(255, Math.floor(r * factor)));
    const dg = Math.max(0, Math.min(255, Math.floor(g * factor)));
    const db = Math.max(0, Math.min(255, Math.floor(b * factor)));
    const textColor = `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
    return {
      backgroundColor: hexColor,
      color: textColor,
      border: `1px solid ${textColor}30`
    };
  } else {
    return {
      backgroundColor: hexColor,
      color: "#FFFFFF",
      border: "1px solid rgba(255, 255, 255, 0.15)"
    };
  }
};
