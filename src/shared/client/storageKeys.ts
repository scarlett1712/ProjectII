/** Central list of localStorage keys to avoid collisions and simplify cleanup or format changes. */
export const STORAGE_KEYS = {
  calendarHiddenHours: "calendar-hidden-hours",
  calendarHiddenTags: "calendar-hidden-tags",
  calendarTagOverrides: "calendar-tag-overrides",
  calendarTaskPositions: "calendar-task-positions",
  dashboardTaskPositions: "dashboard-task-positions",
  nutritionHiddenHours: "nutrition-hidden-hours",
  notificationLog: "star-notification-logs",
  notifiedReminders: "star-notified-cache",
  notifiedWaterSlots: "star-notified-water-cache",
  pwaDismissedAt: "star-pwa-dismissed",
  /** Notify other tabs of a data change through the storage event. */
  dataSyncTrigger: "app-sync-trigger",
} as const;
