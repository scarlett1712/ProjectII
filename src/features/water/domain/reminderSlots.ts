export interface ReminderSlot {
  slotTime: string;
  amountMl: number;
}

export const DEFAULT_REMINDER_START_HOUR = 8;
export const DEFAULT_REMINDER_END_HOUR = 22;

/** Distribute the water target evenly across hours from startHour through endHour inclusive. */
export function buildHourlySlots(
  targetMl: number,
  startHour = DEFAULT_REMINDER_START_HOUR,
  endHour = DEFAULT_REMINDER_END_HOUR,
): ReminderSlot[] {
  const slotCount = Math.max(1, endHour - startHour + 1);
  const perSlot = Math.round(targetMl / slotCount);
  return Array.from({ length: slotCount }, (_, idx) => ({
    slotTime: `${String(startHour + idx).padStart(2, "0")}:00`,
    amountMl: perSlot,
  }));
}

/** Divide the target among selected hours, defaulting to hourly reminders if none are selected. */
export function planReminderSlots(targetMl: number, slotTimes?: string[]): ReminderSlot[] {
  if (!slotTimes || slotTimes.length === 0) return buildHourlySlots(targetMl);
  const perSlot = Math.round(targetMl / slotTimes.length);
  return slotTimes.map((slotTime) => ({ slotTime, amountMl: perSlot }));
}

/** Recommended daily water intake based on weight at 35 ml/kg. */
export function recommendedDailyWaterMl(weightKg: number): number {
  return Math.round(weightKg * 35);
}
