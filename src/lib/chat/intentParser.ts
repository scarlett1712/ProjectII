export type ParsedIntent =
  | { type: "ADD_MEAL"; mealName: string; calories: number; grams: number }
  | { type: "ADD_TASK"; title: string }
  | { type: "ADD_EVENT"; title: string; startAt: string; endAt: string }
  | { type: "SET_WATER_GOAL"; dailyTargetMl: number }
  | { type: "LOG_WATER"; amountMl: number }
  | { type: "SMALL_TALK" };

function parseMeal(content: string): ParsedIntent | null {
  const calMatch = content.match(/(\d+)\s*(kcal|calo|cal)/i);
  if (!/(an|ăn|meal|bua|bữa)/i.test(content) || !calMatch) return null;
  const calories = Number(calMatch[1]);
  const gramsMatch = content.match(/(\d+)\s*(g|gram)/i);
  return {
    type: "ADD_MEAL",
    mealName: content.slice(0, 80),
    calories,
    grams: gramsMatch ? Number(gramsMatch[1]) : 100,
  };
}

function parseLogWater(content: string): ParsedIntent | null {
  // VD: "tôi đã uống 200ml", "vừa uống 1 cốc"
  const mlMatch = content.match(/(?:uong|uống|da uong|đã uống|vua uong|vừa uống).{0,20}?(\d+)\s*(ml|l)/i);
  if (mlMatch) {
    let value = Number(mlMatch[1]);
    if (mlMatch[2].toLowerCase() === "l") value *= 1000;
    return { type: "LOG_WATER", amountMl: value };
  }
  
  const cupMatch = content.match(/(?:uong|uống|da uong|đã uống|vua uong|vừa uống).{0,20}?(\d+)\s*(coc|cốc|ly)/i);
  if (cupMatch) {
    // 1 cốc ~ 250ml
    return { type: "LOG_WATER", amountMl: Number(cupMatch[1]) * 250 };
  }
  
  return null;
}

function parseWaterGoal(content: string): ParsedIntent | null {
  const waterMatch = content.match(/(\d+)\s*(ml|l)\s*(nuoc|nước|water)?/i);
  if (!/(muc tieu|mục tiêu|target|dat|đặt|can uong|cần uống)/i.test(content) || !waterMatch) return null;
  let value = Number(waterMatch[1]);
  if (waterMatch[2].toLowerCase() === "l") value *= 1000;
  return { type: "SET_WATER_GOAL", dailyTargetMl: value };
}

function parseTask(content: string): ParsedIntent | null {
  if (!/(task|viec|việc|nhac|nhắc|todo)/i.test(content)) return null;
  return { type: "ADD_TASK", title: content.slice(0, 120) };
}

function parseEvent(content: string): ParsedIntent | null {
  const timeMatch = content.match(/(\d{1,2})(?:h|:00)/i);
  if (!/(lich|lịch|hop|họp|meeting|event)/i.test(content) || !timeMatch) {
    return null;
  }
  const now = new Date();
  const start = new Date(now);
  start.setHours(Number(timeMatch[1]), 0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return {
    type: "ADD_EVENT",
    title: content.slice(0, 120),
    startAt: start.toISOString(),
    endAt: end.toISOString(),
  };
}

export function parseIntent(content: string): ParsedIntent {
  return (
    parseMeal(content) ??
    parseLogWater(content) ??
    parseWaterGoal(content) ??
    parseEvent(content) ??
    parseTask(content) ?? { type: "SMALL_TALK" }
  );
}
