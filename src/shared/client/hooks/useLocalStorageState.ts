"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { readStoredJson, writeStoredJson } from "../storage";

/**
 * Persist state as JSON in localStorage. Use initial for the first render to match the server,
 * then read after mount. Wait until the read completes before writing to preserve stored data.
 */
export function useLocalStorageState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = readStoredJson<T>(key);
    // Read storage after mount to avoid hydration mismatches.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored !== undefined) setValue(stored);
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (loaded) writeStoredJson(key, value);
  }, [key, value, loaded]);

  return [value, setValue];
}
