"use client";

import { useRef } from "react";
import { apiRequest } from "@/shared/client/api";
import { API_ROUTES } from "@/shared/config/routes";

/**
 * Complete one task occurrence with mode "one". Ignore repeat clicks while the request is pending.
 * The caller updates the UI through onCompleted or onFailed.
 */
export function useCompleteTask<T extends { id: string }>(onCompleted: (task: T) => void, onFailed: (error: unknown) => void) {
  const pendingIds = useRef(new Set<string>());

  return async (task: T) => {
    if (pendingIds.current.has(task.id)) return;
    pendingIds.current.add(task.id);
    try {
      await apiRequest(API_ROUTES.tasks, { method: "PATCH", body: { id: task.id, completed: true, mode: "one" } });
      onCompleted(task);
    } catch (error) {
      onFailed(error);
    } finally {
      pendingIds.current.delete(task.id);
    }
  };
}
