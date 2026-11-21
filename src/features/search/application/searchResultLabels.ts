import { getApiTranslator, type ApiTranslator } from "@/shared/i18n/apiTranslator";
import type { SearchResultLabels } from "../domain/searchResults";

/** Global search result labels translated from api.search.result. */
export function searchResultLabels(t: ApiTranslator = getApiTranslator()): SearchResultLabels {
  return {
    eventType: t("search.result.eventType"),
    eventDesc: (time) => t("search.result.eventDesc", { time }),
    taskType: t("search.result.taskType"),
    taskDone: t("search.result.taskDone"),
    taskPending: t("search.result.taskPending"),
    mealType: t("search.result.mealType"),
    mealDesc: (grams, calories) => t("search.result.mealDesc", { grams: String(grams), calories: String(calories) }),
    transactionType: t("search.result.transactionType"),
    transactionFallbackTitle: t("search.result.transactionFallbackTitle"),
    transactionDesc: (sign, amount) => t("search.result.transactionDesc", { sign, amount: String(amount) }),
  };
}
