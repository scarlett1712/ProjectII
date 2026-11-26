import { badRequest, notFound } from "@/shared/application/errors";
import { createMealEntry, deleteMealEntry } from "@/features/nutrition/application/mealUseCases";
import { createTransaction, deleteTransaction } from "@/features/budget/application/budgetUseCases";
import { isValidDateKey, isValidMonthKey, toLocalDateKey } from "../domain/diaryDate";
import { diaryRepository } from "../infrastructure/diaryRepository";
import type { CreateDiaryPhotoInput, UpdateDiaryPhotoInput, UpsertDiaryEntryInput } from "./diarySchemas";

export async function getDiaryMonth(userId: string, monthKey: string) {
  if (!isValidMonthKey(monthKey)) throw badRequest("diary.invalidDateKey");
  const [photos, journalDateKeys] = await Promise.all([
    diaryRepository.findMonthPhotos(userId, monthKey),
    diaryRepository.findMonthJournalKeys(userId, monthKey),
  ]);
  return { monthKey, photos, journalDateKeys };
}

export async function getDiaryDay(userId: string, dateKey: string) {
  if (!isValidDateKey(dateKey)) throw badRequest("diary.invalidDateKey");
  const [entry, photos] = await Promise.all([
    diaryRepository.findEntry(userId, dateKey),
    diaryRepository.findDayPhotos(userId, dateKey),
  ]);
  return { dateKey, entry, photos };
}

export async function saveDiaryEntry(userId: string, input: UpsertDiaryEntryInput) {
  return diaryRepository.upsertEntry(userId, input.dateKey, input.content, input.mood ?? null);
}

export async function createDiaryPhoto(userId: string, input: CreateDiaryPhotoInput) {
  const takenAt = input.takenAt ? new Date(input.takenAt) : new Date();
  const dateKey = input.dateKey ?? toLocalDateKey(takenAt);
  const todayKey = toLocalDateKey(new Date());
  if (dateKey > todayKey) throw badRequest("diary.futureDateNotAllowed");

  let mealId: string | null = input.mealId ?? null;
  if (mealId) {
    const meal = await diaryRepository.findMealOwned(userId, mealId);
    if (!meal) throw badRequest("diary.mealNotFound");
  } else if (input.newMeal) {
    const createdMeal = await createMealEntry(userId, {
      mealName: input.newMeal.mealName,
      grams: input.newMeal.grams,
      calories: input.newMeal.calories,
      note: input.newMeal.note ?? null,
      eatenAt: input.newMeal.eatenAt ? new Date(input.newMeal.eatenAt) : takenAt,
    });
    mealId = createdMeal.id;
  }

  let transactionId: string | null = input.transactionId ?? null;
  if (transactionId) {
    const tx = await diaryRepository.findTransactionOwned(userId, transactionId);
    if (!tx) throw badRequest("diary.transactionNotFound");
  } else if (input.newTransaction) {
    const createdTx = await createTransaction(userId, {
      amount: input.newTransaction.amount,
      type: input.newTransaction.type,
      categoryId: input.newTransaction.categoryId ?? undefined,
      fromAccountId: input.newTransaction.fromAccountId ?? undefined,
      toAccountId: input.newTransaction.toAccountId ?? undefined,
      note: input.newTransaction.note ?? undefined,
      occurredAt: input.newTransaction.occurredAt ? new Date(input.newTransaction.occurredAt) : takenAt,
    });
    transactionId = createdTx.id;
  }

  return diaryRepository.createPhoto(userId, {
    dateKey,
    takenAt,
    imageData: input.imageData,
    caption: input.caption?.trim() || null,
    mealId,
    transactionId,
  });
}

export async function updateDiaryPhoto(userId: string, input: UpdateDiaryPhotoInput) {
  if (input.mealId) {
    const meal = await diaryRepository.findMealOwned(userId, input.mealId);
    if (!meal) throw badRequest("diary.mealNotFound");
  }
  if (input.transactionId) {
    const tx = await diaryRepository.findTransactionOwned(userId, input.transactionId);
    if (!tx) throw badRequest("diary.transactionNotFound");
  }

  const updated = await diaryRepository.updatePhoto(userId, input.id, {
    ...(input.caption !== undefined ? { caption: input.caption?.trim() || null } : {}),
    ...(input.mealId !== undefined ? { mealId: input.mealId } : {}),
    ...(input.transactionId !== undefined ? { transactionId: input.transactionId } : {}),
  });
  if (!updated) throw notFound("diary.photoNotFound");
  return updated;
}

export async function deleteDiaryPhoto(
  userId: string,
  id: string,
  options?: { deleteMeal?: boolean; deleteTransaction?: boolean },
) {
  if (!id) throw badRequest("diary.photoNotFound");
  const photo = await diaryRepository.findPhotoForDelete(userId, id);
  if (!photo) throw notFound("diary.photoNotFound");

  const deleted = await diaryRepository.deletePhoto(userId, id);
  if (!deleted) throw notFound("diary.photoNotFound");

  if (options?.deleteMeal && photo.mealId) {
    await deleteMealEntry(userId, photo.mealId);
  }
  if (options?.deleteTransaction && photo.transactionId) {
    await deleteTransaction(userId, photo.transactionId).catch(() => undefined);
  }
  return { ok: true };
}
