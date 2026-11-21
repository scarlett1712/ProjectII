import { readStoredJson } from "@/shared/client/storage";
import { STORAGE_KEYS } from "@/shared/client/storageKeys";
import { isSystemTagId } from "../domain/systemTags";

/**
 * The server does not edit system tags (IDs beginning with "system-"). The client stores name and color overrides
 * in localStorage and merges them into tags on load for both Calendar and Dashboard.
 */
export const TAG_OVERRIDES_STORAGE_KEY = STORAGE_KEYS.calendarTagOverrides;

export type TagOverride = { name: string; color: string };
export type TagOverrides = Record<string, TagOverride>;

export { isSystemTagId };

/** Merge custom names and colors into system tags while retaining other tags. */
export function applyTagOverrides<T extends { id: string }>(tags: readonly T[] | null | undefined, overrides: TagOverrides): T[] {
  return (tags ?? []).map((tag) => (isSystemTagId(tag.id) && overrides[tag.id] ? { ...tag, ...overrides[tag.id] } : tag));
}

/** Read stored overrides, defaulting to an empty object on the server or when none exist. */
export function readTagOverrides(): TagOverrides {
  return readStoredJson<TagOverrides>(TAG_OVERRIDES_STORAGE_KEY) ?? {};
}
