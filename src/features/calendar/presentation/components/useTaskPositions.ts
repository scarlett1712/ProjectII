"use client";

import { useLocalStorageState } from "@/shared/client/hooks";
import { seriesIdOf } from "@/shared/domain/recurrence";

/** Pinned note coordinates in pixels from the container's top-left corner. */
export interface TaskPosition {
  x: number;
  y: number;
}

/** Fallback position when no coordinates have been saved. */
const DEFAULT_POSITION: TaskPosition = { x: 200, y: 100 };

/** Treat shorter drags as taps and leave the card in its list. */
const FLOAT_THRESHOLD_PX = 10;

/**
 * Pinned task positions persisted under storageKey in localStorage.
 */
export function useTaskPositions(storageKey: string) {
  const [positions, setPositions] = useLocalStorageState<Record<string, TaskPosition>>(storageKey, {});

  const setPosition = (taskId: string, position: TaskPosition) =>
    setPositions((prev) => ({ ...prev, [taskId]: position }));

  /** Apply the drag offset to the pinned note's position. */
  const movePosition = (taskId: string, offset: TaskPosition) =>
    setPositions((prev) => {
      const current = prev[taskId] ?? DEFAULT_POSITION;
      return { ...prev, [taskId]: { x: current.x + offset.x, y: current.y + offset.y } };
    });

  /** Unpin a note. For an occurrence, withSeries also removes the original series position. */
  const remove = (taskId: string, { withSeries = false }: { withSeries?: boolean } = {}) =>
    setPositions((prev) => {
      const next = { ...prev };
      delete next[taskId];
      if (withSeries) delete next[seriesIdOf(taskId)];
      return next;
    });

  /**
   * Pin a task dragged out of the list at its drop coordinates relative to the element matched by
   * containerSelector. Treat a short drag as a tap.
   */
  const floatFromDrag = (target: EventTarget | null, offset: TaskPosition, taskId: string, containerSelector: string) => {
    if (Math.abs(offset.x) < FLOAT_THRESHOLD_PX && Math.abs(offset.y) < FLOAT_THRESHOLD_PX) return;
    const card = (target as HTMLElement | null)?.closest(".task-card-ref");
    const container = document.querySelector(containerSelector);
    if (!card || !container) return;
    const rect = card.getBoundingClientRect();
    const parentRect = container.getBoundingClientRect();
    setPosition(taskId, { x: rect.left - parentRect.left, y: rect.top - parentRect.top });
  };

  return {
    positions,
    positionOf: (taskId: string) => positions[taskId] ?? DEFAULT_POSITION,
    isFloating: (taskId: string) => !!positions[taskId],
    setPosition,
    movePosition,
    remove,
    floatFromDrag,
  };
}
