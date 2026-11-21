/**
 * Onboarding flags in localStorage. Each flag has an email-specific version when the email is known
 * and a shared fallback for existing clients.
 */

/** Pages with tours, identified by OnboardingTour's pageKey. */
export const TOUR_PAGE_KEYS = ["dashboard", "nutrition-meal", "nutrition-water", "calendar"] as const;

type FlagStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const browserStorage = (): FlagStorage | undefined => {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
};

const suffix = (email: string) => (email ? `-${email}` : "");
const newSignupKey = (email: string) => `is-new-signup${suffix(email)}`;
const tourCompletedKey = (pageKey: string, email: string) => `star-tour-completed-${pageKey}${suffix(email)}`;

/** Mark a newly registered account as eligible for page tours. */
export function markNewSignup(email: string, storage = browserStorage()) {
  if (!storage) return;
  if (email) storage.setItem(newSignupKey(email), "true");
  storage.setItem(newSignupKey(""), "true");
}

/** Restart onboarding by marking the account as new and clearing tour completion flags on all pages. */
export function restartOnboarding(email: string, storage = browserStorage()) {
  if (!storage) return;
  markNewSignup(email, storage);
  for (const pageKey of TOUR_PAGE_KEYS) {
    if (email) storage.removeItem(tourCompletedKey(pageKey, email));
    storage.removeItem(tourCompletedKey(pageKey, ""));
  }
}

/** Whether a new account should see the tour for a page it has not completed. */
export function shouldShowTour(pageKey: string, email: string, storage = browserStorage()): boolean {
  if (!storage) return false;
  const isNewSignup = storage.getItem(newSignupKey(email)) === "true" || storage.getItem(newSignupKey("")) === "true";
  const completed = storage.getItem(tourCompletedKey(pageKey, email)) || (email ? storage.getItem(tourCompletedKey(pageKey, "")) : null);
  return isNewSignup && !completed;
}

/** Record that the tour for this page is complete. */
export function markTourCompleted(pageKey: string, email: string, storage = browserStorage()) {
  if (!storage) return;
  storage.setItem(tourCompletedKey(pageKey, email), "true");
  storage.setItem(tourCompletedKey(pageKey, ""), "true");
}
