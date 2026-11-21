type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

const browserStorage = (): KeyValueStorage | undefined => {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined; // Storage access is blocked by the browser.
  }
};

/** Read JSON from localStorage. Return undefined on the server, on parse failure or when the key is missing. */
export function readStoredJson<T>(key: string, storage: KeyValueStorage | undefined = browserStorage()): T | undefined {
  const raw = storage?.getItem(key);
  if (raw == null) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

/** Write JSON to localStorage, ignoring quota errors, blocked access and server-side calls. */
export function writeStoredJson(key: string, value: unknown, storage: KeyValueStorage | undefined = browserStorage()): void {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures.
  }
}
