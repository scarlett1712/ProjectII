import { z } from "zod";
import { optionalDate } from "@/shared/application/schemaFields";
import { messageKey } from "@/shared/application/errors";

export const setWaterGoalSchema = z.object({
  dailyTargetMl: z.coerce.number({ error: messageKey("water.invalidGoal") }).positive(messageKey("water.goalMustBePositive")),
  slots: z.array(z.string()).nullish().transform((v) => v ?? undefined),
});

export const logWaterSchema = z.object({
  amountMl: z.coerce.number({ error: messageKey("water.invalidAmount") }).positive(messageKey("water.amountMustBePositive")),
  // An empty string or null defaults to the current time, matching previous behavior.
  loggedAt: optionalDate,
});

/** Operation type for POST /api/water. */
export const waterPostKindSchema = z.object(
  { type: z.enum(["goal", "log"], { error: messageKey("common.invalidData") }).optional() },
  { error: messageKey("common.invalidBody") },
);

export const deleteWaterEntrySchema = z.object({
  id: z.string({ error: messageKey("common.missingId") }).min(1, messageKey("common.missingId")),
  type: z.enum(["log", "slot"]).catch("log"),
});

export interface SetWaterGoalInput {
  dailyTargetMl: number;
  /** User-selected times in HH:mm format. Omit them for hourly reminders from 08:00 through 22:00. */
  slots?: string[];
}

export interface LogWaterInput {
  amountMl: number;
  loggedAt?: Date;
}
