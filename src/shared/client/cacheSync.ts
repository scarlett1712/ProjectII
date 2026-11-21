// Centralized client-side cache & sync manager
// 1. Provides instant data retrieval from memory/sessionStorage (0ms delay)
// 2. Automatically updates cache in background
// 3. Listens for window focus / tab visibility / custom sync events across browser tabs and devices

import { API_ROUTES } from "@/shared/config/routes";
import { ApiError } from "./api";
import { STORAGE_KEYS } from "./storageKeys";

const memoryCache = new Map<string, { data: any; timestamp: number }>();

export function getCachedData<T = any>(key: string): T | null {
  if (memoryCache.has(key)) {
    return memoryCache.get(key)!.data as T;
  }
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(`cache:${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        memoryCache.set(key, { data: parsed.data, timestamp: parsed.timestamp });
        return parsed.data as T;
      }
    } catch {
      // Ignore storage errors
    }
  }
  return null;
}

export function setCachedData<T = any>(key: string, data: T) {
  const timestamp = Date.now();
  memoryCache.set(key, { data, timestamp });
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(`cache:${key}`, JSON.stringify({ data, timestamp }));
    } catch {
      // Ignore storage quota errors
    }
  }
}

export function clearCache(keyPrefix?: string) {
  if (!keyPrefix) {
    memoryCache.clear();
    if (typeof window !== "undefined") {
      try {
        Object.keys(sessionStorage).forEach((k) => {
          if (k.startsWith("cache:")) sessionStorage.removeItem(k);
        });
      } catch {}
    }
    return;
  }

  for (const k of memoryCache.keys()) {
    if (k.startsWith(keyPrefix)) memoryCache.delete(k);
  }
  if (typeof window !== "undefined") {
    try {
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith(`cache:${keyPrefix}`)) sessionStorage.removeItem(k);
      });
    } catch {}
  }
}

export interface CacheCallbacks<T> {
  /** Called immediately with cached data when available. */
  onInstant?: (cached: T) => void;
  /** Fresh data from the server. */
  onFresh?: (fresh: T) => void;
  /** Use this callback when cached and fresh data share the same handler. */
  onData?: (data: T) => void;
}

/**
 * Stale-while-revalidate: immediately deliver cached data through onInstant or onData, then fetch, cache and deliver
 * fresh data through onFresh or onData. HTTP errors throw ApiError. Pass options.signal to cancel superseded requests.
 */
export async function fetchWithCache<T = unknown>(
  url: string,
  options?: RequestInit,
  callbacks?: CacheCallbacks<T>,
): Promise<T> {
  const cacheKey = `${options?.method || "GET"}:${url}`;

  const cached = getCachedData<T>(cacheKey);
  if (cached !== null) {
    callbacks?.onInstant?.(cached);
    callbacks?.onData?.(cached);
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string; code?: string } | null;
    throw new ApiError(res.status, body?.error ?? `Fetch failed for ${url}`, body?.code);
  }

  const freshData = (await res.json()) as T;
  setCachedData(cacheKey, freshData);
  callbacks?.onFresh?.(freshData);
  callbacks?.onData?.(freshData);
  return freshData;
}

const CACHE_SCOPE_KEY = "cache-scope";

/**
 * Scope the cache to the signed-in account. Clear previous entries on sign-out or account changes
 * so onInstant can never expose a previous user's data.
 */
export function setCacheScope(userId: string | null) {
  if (typeof window === "undefined") return;
  const scope = userId ?? "";
  try {
    if (sessionStorage.getItem(CACHE_SCOPE_KEY) === scope) return;
    sessionStorage.setItem(CACHE_SCOPE_KEY, scope);
  } catch {
    // Clear the in-memory cache even when sessionStorage is blocked.
  }
  clearCache();
}

/** Data domain used to notify screens and tabs of changes. "all" includes every domain. */
export type DataDomain = "tasks" | "meals" | "water" | "budget" | "calendar" | "profile" | "tags";
export type SyncDomain = DataDomain | "all";

/** Window event reporting a change within this tab, with detail: { domain }. */
export const DATA_SYNC_EVENT = "app-data-sync";
/** localStorage key used to notify other tabs through the storage event. */
export const DATA_SYNC_STORAGE_KEY = STORAGE_KEYS.dataSyncTrigger;

const domainCachePrefix: Record<DataDomain, string> = {
  tasks: API_ROUTES.tasks,
  meals: API_ROUTES.meals.root,
  water: API_ROUTES.water,
  budget: API_ROUTES.budget.root,
  calendar: API_ROUTES.calendar,
  profile: API_ROUTES.profile,
  tags: API_ROUTES.tags,
};

/**
 * Broadcasts data changes to other tabs and notifies active listeners to re-fetch
 */
export function notifyDataChanged(domain: SyncDomain) {
  if (typeof window === "undefined") return;

  // Clear related cache
  if (domain === "all") {
    clearCache();
  } else {
    clearCache(`GET:${domainCachePrefix[domain]}`);
  }

  // Dispatch custom window event
  window.dispatchEvent(new CustomEvent(DATA_SYNC_EVENT, { detail: { domain } }));

  // Notify other tabs via localStorage event
  try {
    localStorage.setItem(DATA_SYNC_STORAGE_KEY, JSON.stringify({ domain, time: Date.now() }));
  } catch {}
}
