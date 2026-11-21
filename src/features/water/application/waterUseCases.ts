import { planReminderSlots } from "../domain/reminderSlots";
import { waterRepository, type WaterEntryType } from "../infrastructure/waterRepository";
import type { LogWaterInput, SetWaterGoalInput } from "./waterSchemas";

const RECENT_LOG_LIMIT = 50;

export async function getWaterOverview(userId: string) {
  const [goal, logs, slots] = await Promise.all([
    waterRepository.findActiveGoal(userId),
    waterRepository.findRecentLogs(userId, RECENT_LOG_LIMIT),
    waterRepository.findSlots(userId),
  ]);
  return { goal, logs, slots, serverTime: new Date().toISOString() };
}

/** Set a new water target from the water screen, profile updates or the chatbot. */
export function setWaterGoal(userId: string, input: SetWaterGoalInput) {
  const slots = planReminderSlots(input.dailyTargetMl, input.slots);
  return waterRepository.replaceActiveGoal(userId, input.dailyTargetMl, slots);
}

export function logWater(userId: string, input: LogWaterInput) {
  return waterRepository.createLog(userId, input.amountMl, input.loggedAt ?? new Date());
}

export function deleteWaterEntry(userId: string, id: string, type: WaterEntryType) {
  return waterRepository.deleteEntry(userId, id, type);
}
