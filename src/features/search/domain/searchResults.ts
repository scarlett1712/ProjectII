import { APP_TIME_ZONE, formatTime } from "@/shared/i18n/format";
import { ROUTES } from "@/shared/config/routes";

/** Search queries are limited to 100 characters. */
export const MAX_SEARCH_QUERY_LENGTH = 100;

/** Normalize the query and return null for empty input to skip the search. */
export function normalizeSearchQuery(raw: string | null | undefined): string | null {
  const trimmed = (raw || "").trim();
  return trimmed ? trimmed.slice(0, MAX_SEARCH_QUERY_LENGTH) : null;
}

export interface SearchResult {
  id: string;
  title: string;
  type: string;
  href: string;
  desc: string;
}

export interface SearchMatches {
  events: { id: string; title: string; startAt: Date }[];
  tasks: { id: string; title: string; completed: boolean }[];
  meals: { id: string; mealName: string; grams: number; calories: number }[];
  transactions: { id: string; note: string | null; type: string; amount: number }[];
}

/** Display labels for search results, supplied by the application layer. */
export interface SearchResultLabels {
  eventType: string;
  eventDesc: (time: string) => string;
  taskType: string;
  taskDone: string;
  taskPending: string;
  mealType: string;
  mealDesc: (grams: number, calories: number) => string;
  transactionType: string;
  transactionFallbackTitle: string;
  transactionDesc: (sign: string, amount: number) => string;
}

/** Combine results in order: calendar events, tasks, meals and transactions. */
export function toSearchResults(matches: SearchMatches, labels: SearchResultLabels): SearchResult[] {
  return [
    ...matches.events.map((e) => ({
      id: e.id,
      title: e.title,
      type: labels.eventType,
      href: ROUTES.calendar,
      // Specify Vietnam's time zone explicitly because the server runs in UTC on Vercel.
      desc: labels.eventDesc(formatTime(e.startAt, { timeZone: APP_TIME_ZONE })),
    })),
    ...matches.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      type: labels.taskType,
      href: ROUTES.calendar,
      desc: t.completed ? labels.taskDone : labels.taskPending,
    })),
    ...matches.meals.map((m) => ({
      id: m.id,
      title: m.mealName,
      type: labels.mealType,
      href: ROUTES.nutrition,
      desc: labels.mealDesc(m.grams, m.calories),
    })),
    ...matches.transactions.map((tr) => ({
      id: tr.id,
      title: tr.note || labels.transactionFallbackTitle,
      type: labels.transactionType,
      href: ROUTES.budget,
      desc: labels.transactionDesc(tr.type === "EXPENSE" ? "-" : "+", tr.amount),
    })),
  ];
}
