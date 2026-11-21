import { normalizeSearchQuery, toSearchResults, type SearchResult } from "../domain/searchResults";
import { searchRepository } from "../infrastructure/searchRepository";
import { searchResultLabels } from "./searchResultLabels";

const RESULTS_PER_TYPE = 5;

export async function globalSearch(userId: string, rawQuery: string | null): Promise<SearchResult[]> {
  const query = normalizeSearchQuery(rawQuery);
  if (!query) return [];
  return toSearchResults(await searchRepository.findMatches(userId, query, RESULTS_PER_TYPE), searchResultLabels());
}
