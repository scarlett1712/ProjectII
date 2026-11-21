"use client";

import { format, parseISO } from "date-fns";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, Modal } from "@/shared/ui/components";
import type { Meal, MealCategoryDetails } from "./mealTypes";

interface MealDetailsModalProps {
  /** Meal being viewed, or null to close the modal. */
  meal: Meal | null;
  category: MealCategoryDetails | null;
  onClose: () => void;
  onEdit: (meal: Meal) => void;
  onDelete: (id: string) => void;
}

/** Meal details modal with edit and delete actions. */
export function MealDetailsModal({ meal, category, onClose, onEdit, onDelete }: MealDetailsModalProps) {
  const t = useTranslations("nutrition");
  const tc = useTranslations("common");

  return (
    <Modal
      open={meal !== null}
      onClose={onClose}
      title={t("meal.details.title")}
      size="sm"
      footer={
        meal && (
          <>
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              {tc("action.close")}
            </Button>
            <Button variant="secondary" onClick={() => onEdit(meal)} title={t("meal.editMeal")}>
              {t("meal.details.edit")}
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => onDelete(meal.id)}
              title={t("meal.deleteMeal")}
            >
              {tc("action.delete")}
            </Button>
          </>
        )
      }
    >
      {meal && category && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
            <span className="text-3xl">{category.emoji}</span>
            <div>
              <h4 className="font-extrabold text-gray-900 text-base">{meal.mealName}</h4>
              <span className={`text-2xs px-2 py-0.5 rounded-full font-bold inline-block mt-0.5 ${category.bg}`}>
                {category.label}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-primary-soft p-3 rounded-xl border border-purple-50">
              <span className="text-xs font-bold text-gray-500 block uppercase">{t("meal.details.weight")}</span>
              <span className="text-base font-black text-primary mt-1 block">
                {meal.grams > 0 ? t("meal.unit.grams", { grams: String(meal.grams) }) : tc("meal.optional")}
              </span>
            </div>
            <div className="bg-primary-soft p-3 rounded-xl border border-purple-50">
              <span className="text-xs font-bold text-gray-500 block uppercase">{t("meal.details.energy")}</span>
              <span className="text-base font-black text-primary mt-1 block">
                {meal.calories > 0 ? t("meal.unit.calories", { calories: String(meal.calories) }) : tc("meal.optional")}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs font-bold text-gray-500 px-1 py-2 border-y border-gray-100">
            <span>{t("meal.details.eatenAt")}</span>
            <span className="text-gray-800">{format(parseISO(meal.eatenAt), "dd/MM/yyyy - HH:mm")}</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
