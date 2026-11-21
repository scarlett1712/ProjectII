"use client";

/** In-app event that delivers reminders and suggestions to the star mascot and notification bell. */
export const STAR_NOTIFICATION_EVENT = "star-notification";

export type StarNotification =
  | { type: "water"; message: string; amountMl: number; slotId: string }
  | { type: "task"; message: string; id: string }
  | { type: "meal-estimate"; message: string; mealId: string; mealName: string };

/** Send a notification to the mascot and bell in the current tab. */
export function emitStarNotification(detail: StarNotification) {
  window.dispatchEvent(new CustomEvent<StarNotification>(STAR_NOTIFICATION_EVENT, { detail }));
}

/** Subscribe to notifications and return an unsubscribe function for effect cleanup. */
export function onStarNotification(handler: (detail: StarNotification) => void): () => void {
  const listener = (event: Event) => handler((event as CustomEvent<StarNotification>).detail);
  window.addEventListener(STAR_NOTIFICATION_EVENT, listener);
  return () => window.removeEventListener(STAR_NOTIFICATION_EVENT, listener);
}
