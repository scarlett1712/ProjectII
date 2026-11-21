"use client";

import { useTranslations } from "next-intl";
import { getTagStyles } from "@/shared/theme/tagStyles";

interface TagChipProps {
  name: string;
  color: string;
  isSystem?: boolean;
}

/** Pill in the tag's color with a suffix distinguishing default and custom tags. */
export function TagChip({ name, color, isSystem }: TagChipProps) {
  const tc = useTranslations("common");
  return (
    <span className="inline-block rounded-full px-3 py-1 font-sans text-xs font-bold" style={getTagStyles(color)}>
      {name} {isSystem ? tc("colorPicker.defaultSuffix") : tc("schedule.customColor")}
    </span>
  );
}
