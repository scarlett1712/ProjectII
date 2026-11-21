"use client";

import { useEffect, useEffectEvent } from "react";
import { DATA_SYNC_EVENT, DATA_SYNC_STORAGE_KEY, type DataDomain, type SyncDomain } from "../cacheSync";
import { isSyncRelevant, parseSyncStorageValue, readSyncDomain } from "../dataSync";

/** Returning to a tab usually fires both focus and visibilitychange. Coalesce events inside this interval. */
const VISIBLE_DEDUPE_MS = 1000;

export interface DataSyncOptions {
  /** Watch only these domains. An "all" change always matches, and omitting the list watches everything. */
  domains?: readonly DataDomain[];
  /** Called when the tab or window regains focus. Defaults to onSync("all"). */
  onVisible?: () => void;
}

/**
 * Reload after changes from notifyDataChanged in this tab, a storage event from another tab,
 * or a return to the tab. The caller handles the initial load.
 * Always call the latest onSync callback with the changed domain, or "all" for a full reload.
 */
export function useDataSync(onSync: (domain: SyncDomain) => void, options: DataSyncOptions = {}) {
  const fire = useEffectEvent((domain: SyncDomain) => {
    if (isSyncRelevant(domain, options.domains)) onSync(domain);
  });
  const fireVisible = useEffectEvent(() => {
    if (options.onVisible) options.onVisible();
    else onSync("all");
  });

  useEffect(() => {
    let lastVisibleAt = 0;
    const handleSync = (event: Event) => fire(readSyncDomain((event as CustomEvent).detail));
    const handleStorage = (event: StorageEvent) => {
      if (event.key === DATA_SYNC_STORAGE_KEY) fire(parseSyncStorageValue(event.newValue));
    };
    const handleVisible = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastVisibleAt < VISIBLE_DEDUPE_MS) return;
      lastVisibleAt = now;
      fireVisible();
    };

    window.addEventListener(DATA_SYNC_EVENT, handleSync);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleVisible);
    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      window.removeEventListener(DATA_SYNC_EVENT, handleSync);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleVisible);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, []);
}
