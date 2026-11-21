"use client";

import { useTranslations } from "next-intl";
import { Button, Field, Select, TextInput } from "@/shared/ui/components";

/** Profile editor values. Keep measurements as strings to match their input fields. */
export interface ProfileFormValues {
  name: string;
  gender: string;
  age: string;
  weight: string;
  height: string;
  activity: string;
}

const ACTIVITY_LEVELS = ["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"] as const;

interface ProfileEditFormProps {
  values: ProfileFormValues;
  onChange: (patch: Partial<ProfileFormValues>) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
}

/** Profile edit form inside the profile modal. */
export function ProfileEditForm({ values, onChange, onSubmit, onCancel }: ProfileEditFormProps) {
  const tShell = useTranslations("shell");
  const tc = useTranslations("common");

  return (
    <form onSubmit={onSubmit} className="w-full">
      <h2 className="mb-6 text-center text-xl font-bold text-primary">{tShell("profile.editTitle")}</h2>
      <div className="max-h-[50vh] space-y-4 overflow-y-auto px-1">
        <Field label={tShell("profile.fullName")}>
          <TextInput
            type="text"
            value={values.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={tShell("profile.fullNamePlaceholder")}
          />
        </Field>
        <Field label={tc("profile.gender")}>
          <Select value={values.gender} onChange={(e) => onChange({ gender: e.target.value })}>
            <option value="MALE">{tc("profile.male")}</option>
            <option value="FEMALE">{tc("profile.female")}</option>
            <option value="OTHER">{tShell("profile.genderOther")}</option>
          </Select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label={tc("profile.age")}>
            <TextInput
              type="number"
              value={values.age}
              onChange={(e) => onChange({ age: e.target.value })}
              placeholder={tc("profile.age")}
            />
          </Field>
          <Field label={tShell("profile.weightKg")}>
            <TextInput
              type="number"
              value={values.weight}
              onChange={(e) => onChange({ weight: e.target.value })}
              placeholder={tc("profile.weight")}
            />
          </Field>
          <Field label={tShell("profile.heightCm")}>
            <TextInput
              type="number"
              value={values.height}
              onChange={(e) => onChange({ height: e.target.value })}
              placeholder={tc("profile.height")}
            />
          </Field>
        </div>
        <Field label={tc("profile.activityLevel")}>
          <Select value={values.activity} onChange={(e) => onChange({ activity: e.target.value })}>
            {ACTIVITY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {tShell(`activityLevelOption.${level}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="mt-8 flex gap-3">
        <Button variant="secondary" size="lg" className="flex-1" onClick={onCancel}>
          {tc("action.cancel")}
        </Button>
        <Button type="submit" size="lg" className="flex-1">
          {tc("action.save")}
        </Button>
      </div>
    </form>
  );
}
