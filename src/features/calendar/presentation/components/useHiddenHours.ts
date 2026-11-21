"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useLocalStorageState } from "@/shared/client/hooks";

/** Open hour menu at the pointer coordinates. */
export interface HourMenuState {
  hour: number;
  x: number;
  y: number;
}

/**
 * Hidden hours for week and day views, persisted under storageKey, and the menu for managing them.
 * Notify the user after each action.
 */
export function useHiddenHours(storageKey: string, notify: (message: string) => void) {
  const tc = useTranslations("common");
  const [hiddenHours, setHiddenHours] = useLocalStorageState<number[]>(storageKey, []);
  const [hourMenu, setHourMenu] = useState<HourMenuState | null>(null);

  const hideHour = (hour: number) => {
    setHiddenHours((prev) => [...prev, hour]);
    setHourMenu(null);
    notify(tc("timeGrid.rowHidden", { hour: String(hour).padStart(2, "0") }));
  };

  const showAllHours = () => {
    setHiddenHours([]);
    setHourMenu(null);
    notify(tc("timeGrid.allRowsShown"));
  };

  return {
    hiddenHours,
    hourMenu,
    openHourMenu: (hour: number, x: number, y: number) => setHourMenu({ hour, x, y }),
    closeHourMenu: () => setHourMenu(null),
    hideHour,
    showAllHours,
  };
}
