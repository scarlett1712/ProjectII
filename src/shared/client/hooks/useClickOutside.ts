"use client";

import { useEffect, useEffectEvent, type RefObject } from "react";

/**
 * Call onOutside on clicks or taps outside ref. Listen on document so dropdowns and menus work
 * across stacking contexts, including containers with backdrop-filter.
 */
export function useClickOutside(ref: RefObject<HTMLElement | null>, onOutside: () => void, enabled = true) {
  const handleOutside = useEffectEvent(onOutside);
  useEffect(() => {
    if (!enabled) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) handleOutside();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [enabled, ref]);
}
