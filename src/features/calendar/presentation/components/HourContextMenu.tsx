"use client";

import { useTranslations } from "next-intl";
import type { HourMenuState } from "./useHiddenHours";

interface HourContextMenuProps {
  menu: HourMenuState | null;
  canShowAll: boolean;
  onHide: (hour: number) => void;
  onShowAll: () => void;
  onClose: () => void;
}

/** Hour-label menu for hiding that hour or restoring all hidden hours. */
export function HourContextMenu({ menu, canShowAll, onHide, onShowAll, onClose }: HourContextMenuProps) {
  const tc = useTranslations("common");
  if (!menu) return null;

  return (
    <>
      <div className="fixed inset-0 z-[199]" onClick={onClose} />
      <div
        className="fixed z-[200] w-40 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl"
        style={{ left: menu.x, top: menu.y }}
      >
        <button
          type="button"
          onClick={() => onHide(menu.hour)}
          className="flex w-full items-center gap-1.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-red-500 transition-colors hover:bg-red-50"
        >
          {tc("timeGrid.hideRow")}
        </button>
        {canShowAll && (
          <button
            type="button"
            onClick={onShowAll}
            className="mt-1 flex w-full items-center gap-1.5 rounded-xl border-t border-gray-50 px-3 py-2 pt-2 text-left text-xs font-bold text-purple-600 transition-colors hover:bg-purple-50"
          >
            {tc("timeGrid.showAllRows")}
          </button>
        )}
      </div>
    </>
  );
}
