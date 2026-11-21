import type { SyncDomain } from "./cacheSync";

/** Domain in a sync event. Default to "all" when missing or unreadable. */
export function readSyncDomain(value: unknown): SyncDomain {
  if (value && typeof value === "object" && "domain" in value) {
    const domain = (value as { domain?: unknown }).domain;
    if (typeof domain === "string" && domain) return domain as SyncDomain;
  }
  return "all";
}

/** Read the domain from the { domain, time } value written to localStorage by notifyDataChanged. */
export function parseSyncStorageValue(raw: string | null): SyncDomain {
  if (!raw) return "all";
  try {
    return readSyncDomain(JSON.parse(raw));
  } catch {
    return "all";
  }
}

/** Whether the changed domain affects the watched domains. Omitting watched includes all domains. */
export function isSyncRelevant(domain: SyncDomain, watched?: readonly SyncDomain[]): boolean {
  return domain === "all" || !watched || watched.length === 0 || watched.includes(domain);
}
