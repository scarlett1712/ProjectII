"use client";

import { useTranslations } from "next-intl";
import { Button, Field, Modal, SegmentedControl, TextInput } from "@/shared/ui/components";
import { MEAL_CATEGORIES, MEAL_CATEGORY_KEYS } from "@/features/nutrition/domain/mealCategories";

interface MealFormModalProps {
  open: boolean;
  /** Editing an existing meal changes the title and save button label. */
  isEditing: boolean;
  mealName: string;
  onMealNameChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  mealTime: string;
  onMealTimeChange: (value: string) => void;
  grams: number | "";
  onGramsChange: (value: number | "") => void;
  calories: number | "";
  onCaloriesChange: (value: number | "") => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

const toOptionalNumber = (value: string): number | "" => (value === "" ? "" : Number(value));

/** Meal editor for the name, category, time, weight and calories. */
export function MealFormModal({
  open,
  isEditing,
  mealName,
  onMealNameChange,
  category,
  onCategoryChange,
  mealTime,
  onMealTimeChange,
  grams,
  onGramsChange,
  calories,
  onCaloriesChange,
  isSubmitting,
  onSubmit,
  onClose,
}: MealFormModalProps) {
  const t = useTranslations("nutrition");
  const tc = useTranslations("common");
  // Persist stable meal category values and use translation keys for display labels.
  const categoryOptions = MEAL_CATEGORY_KEYS.map((key) => ({ value: MEAL_CATEGORIES[key] as string, label: tc(`meal.${key}`) }));

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? t("meal.editMeal") : tc("mealForm.title")} size="lg">
      <form onSubmit={onSubmit} className="space-y-5">
        <TextInput
          required
          type="text"
          placeholder={tc("mealForm.namePlaceholder")}
          aria-label={tc("mealForm.namePlaceholder")}
          value={mealName}
          onChange={(e) => onMealNameChange(e.target.value)}
        />
        <SegmentedControl options={categoryOptions} value={category} onChange={onCategoryChange} size="sm" />
        <Field label={tc("mealForm.eatenAt")}>
          <TextInput type="time" value={mealTime} onChange={(e) => onMealTimeChange(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={tc("mealForm.grams")}>
            <TextInput type="text" value={grams} onChange={(e) => onGramsChange(toOptionalNumber(e.target.value))} />
          </Field>
          <Field label={tc("mealForm.calories")}>
            <TextInput type="text" value={calories} onChange={(e) => onCaloriesChange(toOptionalNumber(e.target.value))} />
          </Field>
        </div>
        <Button type="submit" size="lg" fullWidth loading={isSubmitting} loadingText={tc("action.saving")}>
          {isEditing ? tc("action.saveChanges") : tc("mealForm.submit")}
        </Button>
      </form>
    </Modal>
  );
}
