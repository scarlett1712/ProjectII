"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { defaultColors } from "@/shared/theme/palettes";
import { cn, controlClasses } from "@/shared/ui/components";
import type { Tag } from "../types";
import { TagChip } from "./TagChip";

interface TagDropdownProps {
  tags: Tag[];
  value: string;
  /** Selecting a tag applies its color to the note. Clearing the tag restores the default note color. */
  onSelect: (tagId: string, color: string) => void;
}

const optionClasses = "flex w-full items-center rounded-xl p-2 text-left transition-colors hover:bg-purple-50/50";

/** Use a custom popover to display colored tag options. */
export function TagDropdown({ tags, value, onSelect }: TagDropdownProps) {
  const t = useTranslations("calendar");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const selectedTag = tags.find((tag) => tag.id === value);

  const choose = (tagId: string, color: string) => {
    onSelect(tagId, color);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(controlClasses, "flex items-center justify-between text-left")}
        aria-label={t("eventForm.selectTag")}
        aria-expanded={open}
      >
        {selectedTag ? (
          <TagChip name={selectedTag.name} color={selectedTag.color} isSystem={selectedTag.isSystem} />
        ) : (
          <span className="text-xs font-bold text-ink-subtle">{tc("schedule.noTag")}</span>
        )}
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-primary" />
      </button>

      {open && (
        <>
          {/* Transparent backdrop for dismissing the popover. */}
          <div className="fixed inset-0 z-[240]" onClick={() => setOpen(false)} />
          <div className="absolute z-[250] mt-1.5 max-h-[200px] w-full space-y-1 overflow-y-auto overscroll-contain rounded-2xl border border-gray-100 bg-white p-2 shadow-xl scrollbar-thin">
            <button type="button" onClick={() => choose("", defaultColors.note)} className={optionClasses}>
              <span className="inline-block rounded-full border border-gray-200 bg-gray-100 px-3 py-1 font-sans text-xs font-bold text-gray-500">
                {tc("schedule.noTag")}
              </span>
            </button>
            {tags.map((tag) => (
              <button key={tag.id} type="button" onClick={() => choose(tag.id, tag.color)} className={optionClasses}>
                <TagChip name={tag.name} color={tag.color} isSystem={tag.isSystem} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
