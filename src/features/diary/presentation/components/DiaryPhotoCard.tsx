"use client";

import Link from "next/link";
import { Pencil, Trash2, UtensilsCrossed, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { format, parseISO } from "date-fns";
import { ROUTES, withQuery } from "@/shared/config/routes";
import { formatShortCurrencyTag } from "@/features/diary/domain/diaryDate";
import type { DiaryPhoto } from "../types";

interface DiaryPhotoCardProps {
  photo: DiaryPhoto;
  compact?: boolean;
  onEditCaption?: (photo: DiaryPhoto) => void;
  onDelete?: (photo: DiaryPhoto) => void;
}

const MEAL_NOTE_KEYS = new Set(["breakfast", "lunch", "dinner", "snack", "other"]);

export function DiaryPhotoCard({ photo, compact = false, onEditCaption, onDelete }: DiaryPhotoCardProps) {
  const tc = useTranslations("common");
  const t = useTranslations("diary.camera");

  const mealLabel = photo.meal
    ? photo.meal.note && MEAL_NOTE_KEYS.has(photo.meal.note)
      ? tc(`meal.${photo.meal.note}` as "meal.breakfast")
      : photo.meal.mealName
    : null;

  const txLabel = photo.transaction
    ? formatShortCurrencyTag(photo.transaction.amount, photo.transaction.type)
    : null;

  return (
    <div className="group relative overflow-hidden rounded-3xl bg-gray-100 shadow-sm border border-gray-100 aspect-square">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.imageData}
        alt={photo.caption || mealLabel || "Diary photo"}
        className="h-full w-full object-cover"
      />

      {/* Subtle gradient overlay for readable Locket-style badges & caption */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/45" />

      {/* Top-left: Meal tag */}
      {photo.meal && mealLabel && (
        <Link
          href={withQuery(ROUTES.nutrition, { tab: "meal" })}
          title={`${photo.meal.mealName}${photo.meal.calories > 0 ? ` (${photo.meal.calories} kcal)` : ""}`}
          className="absolute top-3 left-3 z-10 inline-flex max-w-[46%] items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md transition hover:bg-primary"
        >
          <UtensilsCrossed className="h-3 w-3 shrink-0" />
          <span className="truncate">{mealLabel}</span>
        </Link>
      )}

      {/* Top-right: Transaction tag */}
      {photo.transaction && txLabel && (
        <Link
          href={ROUTES.budget}
          title={photo.transaction.note || photo.transaction.category?.name || txLabel}
          className={`absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md transition hover:opacity-90 ${
            photo.transaction.type === "INCOME"
              ? "bg-emerald-600/85"
              : photo.transaction.type === "EXPENSE"
                ? "bg-rose-600/85"
                : "bg-indigo-600/85"
          }`}
        >
          <Wallet className="h-3 w-3 shrink-0" />
          <span>{txLabel}</span>
        </Link>
      )}

      {/* Bottom-center: Locket-style note */}
      {photo.caption && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex justify-center">
          <p className="max-w-full truncate rounded-full bg-black/60 px-3.5 py-1.5 text-center text-xs sm:text-sm font-semibold text-white backdrop-blur-md">
            {photo.caption}
          </p>
        </div>
      )}

      {/* Time & Actions (visible on hover / non-compact) */}
      {!compact && (
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onEditCaption && (
            <button
              type="button"
              onClick={() => onEditCaption(photo)}
              aria-label={t("editCaption")}
              className="rounded-full bg-black/60 p-1.5 text-white backdrop-blur-md hover:bg-primary"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(photo)}
              aria-label={tc("action.delete")}
              className="rounded-full bg-black/60 p-1.5 text-white backdrop-blur-md hover:bg-danger"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {!compact && !photo.caption && (
        <span className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full bg-black/45 px-2.5 py-0.5 text-2xs font-semibold text-white/90 backdrop-blur-sm">
          {format(parseISO(photo.takenAt), "HH:mm")}
        </span>
      )}
    </div>
  );
}
