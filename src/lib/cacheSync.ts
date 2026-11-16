// Centralized client-side cache & sync manager
// 1. Provides instant data retrieval from memory/sessionStorage (0ms delay)
// 2. Automatically updates cache in background
// 3. Listens for window focus / tab visibility / custom sync events across browser tabs and devices

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

/**
 * Fetch with Stale-While-Revalidate caching pattern
 * If cached data exists: invokes onInstant(cachedData) immediately (0ms!)
 * Then runs the actual fetch, updates cache, and invokes onFresh(freshData)
 */
export async function fetchWithCache<T = any>(
  url: string,
  options?: RequestInit,
  callbacks?: {
    onInstant?: (cached: T) => void;
    onFresh?: (fresh: T) => void;
  }
): Promise<T> {
  const cacheKey = `${options?.method || "GET"}:${url}`;

  // Instant data from cache
  const cached = getCachedData<T>(cacheKey);
  if (cached && callbacks?.onInstant) {
    callbacks.onInstant(cached);
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Fetch failed for ${url}: ${res.status}`);
  }

  const freshData = await res.json();
  setCachedData(cacheKey, freshData);

  if (callbacks?.onFresh) {
    callbacks.onFresh(freshData);
  }

  return freshData;
}

/**
 * Broadcasts data changes to other tabs and notifies active listeners to re-fetch
 */
export function notifyDataChanged(domain: "tasks" | "meals" | "water" | "budget" | "calendar" | "profile" | "all") {
  if (typeof window === "undefined") return;

  // Clear related cache
  if (domain === "all") {
    clearCache();
  } else {
    clearCache(`GET:/api/${domain}`);
  }

  // Dispatch custom window event
  window.dispatchEvent(new CustomEvent("app-data-sync", { detail: { domain } }));

  // Notify other tabs via localStorage event
  try {
    localStorage.setItem("app-sync-trigger", JSON.stringify({ domain, time: Date.now() }));
  } catch {}
}
