import { z } from "zod";
import { isValidDateKey } from "../domain/diaryDate";

const MAX_IMAGE_DATA_LENGTH = 2_000_000;

export const dateKeySchema = z.string().refine(isValidDateKey, "diary.invalidDateKey");

export const upsertDiaryEntrySchema = z.object({
  dateKey: dateKeySchema,
  content: z.string().max(10_000, "diary.saveFailed"),
  mood: z.string().max(32).optional().nullable(),
});

const newMealForPhotoSchema = z.object({
  mealName: z.string().trim().min(1),
  grams: z.number().nonnegative().default(0),
  calories: z.number().int().nonnegative().default(0),
  note: z.string().max(50).optional().nullable(),
  eatenAt: z.string().datetime().optional(),
});

const newTransactionForPhotoSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  categoryId: z.string().optional().nullable(),
  fromAccountId: z.string().optional().nullable(),
  toAccountId: z.string().optional().nullable(),
  note: z.string().max(300).optional().nullable(),
  occurredAt: z.string().datetime().optional(),
});

export const createDiaryPhotoSchema = z.object({
  imageData: z
    .string()
    .min(1, "diary.invalidImage")
    .max(MAX_IMAGE_DATA_LENGTH, "diary.invalidImage")
    .refine(
      (v) =>
        v.startsWith("data:image/jpeg;base64,") ||
        v.startsWith("data:image/png;base64,") ||
        v.startsWith("data:image/webp;base64,"),
      "diary.invalidImage",
    ),
  caption: z.string().max(500).optional().nullable(),
  dateKey: dateKeySchema.optional(),
  takenAt: z.string().datetime().optional(),
  mealId: z.string().optional().nullable(),
  transactionId: z.string().optional().nullable(),
  newMeal: newMealForPhotoSchema.optional().nullable(),
  newTransaction: newTransactionForPhotoSchema.optional().nullable(),
});

export const updateDiaryPhotoSchema = z.object({
  id: z.string().min(1, "diary.photoNotFound"),
  caption: z.string().max(500).optional().nullable(),
  mealId: z.string().optional().nullable(),
  transactionId: z.string().optional().nullable(),
});

export type UpsertDiaryEntryInput = z.infer<typeof upsertDiaryEntrySchema>;
export type CreateDiaryPhotoInput = z.infer<typeof createDiaryPhotoSchema>;
export type UpdateDiaryPhotoInput = z.infer<typeof updateDiaryPhotoSchema>;
