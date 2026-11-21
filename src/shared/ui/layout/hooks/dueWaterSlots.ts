/** Allow reminders for 30 minutes after a slot so users returning late can still receive them, matching server cron behavior. */
export const WATER_SLOT_WINDOW_MINUTES = 30;

export interface WaterSlotLike {
  id: string;
  slotTime: string;
  amountMl: number;
  enabled?: boolean;
}

export interface WaterLogLike {
  loggedAt: string | Date;
}

/** Parse an HH:mm slot into its hour and minutes since midnight. Return null for invalid input. */
function parseSlot(slotTime: string): { hour: number; minutes: number } | null {
  const [h, m] = slotTime.split(":").map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  return { hour: h, minutes: h * 60 + m };
}

const sameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * A water slot is due at the user's local time when enabled and within 30 minutes after its scheduled time,
 * provided no intake has been logged during the same local hour today.
 */
export function dueWaterSlots<T extends WaterSlotLike>(slots: T[], logs: WaterLogLike[], now: Date): T[] {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const drankHours = new Set(
    logs
      .map((log) => new Date(log.loggedAt))
      .filter((loggedAt) => !Number.isNaN(loggedAt.getTime()) && sameLocalDay(loggedAt, now))
      .map((loggedAt) => loggedAt.getHours()),
  );
  return slots.filter((slot) => {
    if (slot.enabled === false) return false;
    const parsed = parseSlot(slot.slotTime);
    if (!parsed || drankHours.has(parsed.hour)) return false;
    const elapsed = nowMinutes - parsed.minutes;
    return elapsed >= 0 && elapsed <= WATER_SLOT_WINDOW_MINUTES;
  });
}
