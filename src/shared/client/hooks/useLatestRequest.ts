"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Each call to nextSignal() cancels the previous request so rapid changes of month, day or session
 * cannot replace current data with an older response. Also cancel on unmount.
 */
export function useLatestRequest(): () => AbortSignal {
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  return useCallback(() => {
    controller.current?.abort();
    controller.current = new AbortController();
    return controller.current.signal;
  }, []);
}

/**
 * Track asynchronous work other than requests, such as session changes. next() issues a new token.
 * Use isLatest(token) to discard results that belong to an earlier operation.
 */
export function useLatestToken() {
  const latest = useRef(0);
  const next = useCallback(() => ++latest.current, []);
  const current = useCallback(() => latest.current, []);
  const isLatest = useCallback((token: number) => token === latest.current, []);
  return { next, current, isLatest };
}
