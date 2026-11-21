"use client";

import { useRef } from "react";

/** Ignore taps for this many milliseconds after release because Framer Motion also fires a tap after dragging. */
const TAP_GUARD_MS = 50;

/**
 * Distinguish dragging from tapping. wasDragged() is true during the drag
 * and briefly after release.
 */
export function useTapAfterDrag() {
  const dragging = useRef(false);
  return {
    onDragStart: () => {
      dragging.current = true;
    },
    onDragEnd: () => {
      setTimeout(() => {
        dragging.current = false;
      }, TAP_GUARD_MS);
    },
    wasDragged: () => dragging.current,
  };
}
