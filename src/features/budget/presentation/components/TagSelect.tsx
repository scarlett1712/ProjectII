"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn, controlClasses } from "@/shared/ui/components";
import { TagPill } from "./TagPill";

export interface TagSelectItem {
  id: string;
  name: string;
  color: string;
}

export interface TagSelectProps<T extends TagSelectItem> {
  /** Field assigns its id to the trigger button to associate the label. */
  id?: string;
  items: readonly T[];
  value: string;
  onChange: (id: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder: string;
  emptyText: string;
  /** Open the list upward for fields near the bottom of the form. */
  dropUp?: boolean;
  /** Secondary text beneath an option, such as the account balance. */
  renderDetail?: (item: T) => ReactNode;
  /** Fallback color for options without a color. */
  fallbackColor?: string;
}

/** Account or category selector that displays the selection as a colored label. */
export function TagSelect<T extends TagSelectItem>({
  id,
  items,
  value,
  onChange,
  open,
  onOpenChange,
  placeholder,
  emptyText,
  dropUp = false,
  renderDetail,
  fallbackColor = "",
}: TagSelectProps<T>) {
  const selected = value ? items.find((item) => item.id === value) : undefined;

  return (
    <div className="relative w-full">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className={cn(controlClasses, "flex items-center justify-between text-left")}
      >
        {selected ? (
          <TagPill name={selected.name} color={selected.color || fallbackColor} className="max-w-full truncate" />
        ) : (
          <span className="text-ink-subtle">{placeholder}</span>
        )}
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-primary" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => onOpenChange(false)} aria-hidden />
          <div
            role="listbox"
            className={cn(
              "absolute z-20 max-h-56 w-full space-y-1 overflow-y-auto overscroll-contain rounded-2xl border border-line bg-white p-2 shadow-xl scrollbar-thin",
              dropUp ? "bottom-full mb-1.5" : "top-full mt-1.5",
            )}
          >
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={item.id === value}
                onClick={() => {
                  onChange(item.id);
                  onOpenChange(false);
                }}
                className="flex w-full min-w-0 flex-col items-start gap-1 rounded-xl px-3 py-2 text-left transition-colors hover:bg-primary-soft"
              >
                <TagPill name={item.name} color={item.color || fallbackColor} className="max-w-full truncate" />
                {renderDetail && (
                  <span className="ml-1 rounded-lg bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                    {renderDetail(item)}
                  </span>
                )}
              </button>
            ))}
            {items.length === 0 && <p className="p-3 text-center text-xs font-bold text-ink-subtle">{emptyText}</p>}
          </div>
        </>
      )}
    </div>
  );
}
