"use client";

import { useTranslations } from "next-intl";
import { MEAL_CATEGORIES, MEAL_CATEGORY_KEYS, defaultMealTime } from "@/features/nutrition/domain/mealCategories";
import { Button, Field, Modal, SegmentedControl, TextInput } from "@/shared/ui/components";

interface MealFormData {
  name: string;
  category: string;
  time: string;
  grams: string;
  calories: string;
}

interface QuickMealModalProps {
  showAddMeal: boolean;
  onClose: () => void;
  mealForm: MealFormData;
  setMealForm: (val: MealFormData) => void;
  handleSaveMeal: () => void;
  isSubmitting: boolean;
}

export function QuickMealModal({
  showAddMeal,
  onClose,
  mealForm,
  setMealForm,
  handleSaveMeal,
  isSubmitting,
}: QuickMealModalProps) {
  const tc = useTranslations("common");
  // Persist stable meal category values and use category translation keys for display labels.
  const categoryOptions = MEAL_CATEGORY_KEYS.map((key) => ({ value: MEAL_CATEGORIES[key] as string, label: tc(`meal.${key}`) }));

  return (
    <Modal
      open={showAddMeal}
      onClose={onClose}
      title={tc("mealForm.title")}
      size="md"
      footer={
        <Button fullWidth onClick={handleSaveMeal} loading={isSubmitting} loadingText={tc("action.adding")}>
          {tc("mealForm.submit")}
        </Button>
      }
    >
      <div className="space-y-5">
        <TextInput
          type="text"
          placeholder={tc("mealForm.namePlaceholder")}
          aria-label={tc("mealForm.namePlaceholder")}
          value={mealForm.name}
          onChange={(e) => setMealForm({ ...mealForm, name: e.target.value })}
        />
        <SegmentedControl
          size="sm"
          options={categoryOptions}
          value={mealForm.category}
          onChange={(category) =>
            setMealForm({ ...mealForm, category, time: defaultMealTime(category) })
          }
        />
        <Field label={tc("mealForm.eatenAt")}>
          <TextInput
            type="time"
            value={mealForm.time}
            onChange={(e) => setMealForm({ ...mealForm, time: e.target.value })}
          />
        </Field>
        <div className="flex gap-4">
          <TextInput
            type="text"
            placeholder={tc("mealForm.grams")}
            aria-label={tc("mealForm.grams")}
            value={mealForm.grams}
            onChange={(e) => setMealForm({ ...mealForm, grams: e.target.value })}
            className="w-1/2"
          />
          <TextInput
            type="number"
            placeholder={tc("mealForm.calories")}
            aria-label={tc("mealForm.calories")}
            value={mealForm.calories}
            onChange={(e) => setMealForm({ ...mealForm, calories: e.target.value })}
            className="w-1/2"
          />
        </div>
      </div>
    </Modal>
  );
}
