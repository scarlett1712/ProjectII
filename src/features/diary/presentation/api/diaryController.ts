import { NextRequest } from "next/server";
import { badRequest, readJson, withUser } from "@/shared/presentation/http";
import { toLocalMonthKey } from "../../domain/diaryDate";
import {
  createDiaryPhotoSchema,
  updateDiaryPhotoSchema,
  upsertDiaryEntrySchema,
} from "../../application/diarySchemas";
import {
  createDiaryPhoto,
  deleteDiaryPhoto,
  getDiaryDay,
  getDiaryMonth,
  saveDiaryEntry,
  updateDiaryPhoto,
} from "../../application/diaryUseCases";

export const getDiary = withUser(
  async (req: NextRequest, userId) => {
    const date = req.nextUrl.searchParams.get("date");
    if (date) return getDiaryDay(userId, date);
    const month = req.nextUrl.searchParams.get("month") || toLocalMonthKey(new Date());
    return getDiaryMonth(userId, month);
  },
  { errorCode: "diary.loadFailed" },
);

export const putDiaryEntry = withUser(
  async (req: NextRequest, userId) => {
    const input = upsertDiaryEntrySchema.parse(await readJson(req));
    return saveDiaryEntry(userId, input);
  },
  { errorCode: "diary.saveFailed" },
);

export const postDiaryPhoto = withUser(
  async (req: NextRequest, userId) => {
    const input = createDiaryPhotoSchema.parse(await readJson(req));
    return createDiaryPhoto(userId, input);
  },
  { errorCode: "diary.saveFailed" },
);

export const patchDiaryPhoto = withUser(
  async (req: NextRequest, userId) => {
    const input = updateDiaryPhotoSchema.parse(await readJson(req));
    return updateDiaryPhoto(userId, input);
  },
  { errorCode: "diary.saveFailed" },
);

export const deleteDiaryPhotoHandler = withUser(
  async (req: NextRequest, userId) => {
    const params = req.nextUrl.searchParams;
    const id = params.get("id");
    if (!id) throw badRequest("diary.photoNotFound");
    return deleteDiaryPhoto(userId, id, {
      deleteMeal: params.get("deleteMeal") === "1",
      deleteTransaction: params.get("deleteTransaction") === "1",
    });
  },
  { errorCode: "diary.deleteFailed" },
);
