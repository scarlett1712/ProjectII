import { getNotificationPermission, requestNotificationPermission } from "@/shared/client/clientNotifications";

/** On first activation, request notification permission and register Web Push. Respect existing permission decisions. */
export function promptNotificationPermission(): void {
  if (getNotificationPermission() === "default") void requestNotificationPermission();
}
