/**
 * Lock background scrolling for modals and onboarding tours. Count open overlays so nested overlays retain the lock.
 * The app scrolls within main, so lock html, body and main.
 */
let lockCount = 0;
let savedOverflow: Array<[HTMLElement, string]> = [];

export function lockBackgroundScroll() {
  if (lockCount++ > 0) return;
  const targets = [document.documentElement, document.body, document.querySelector("main")].filter(
    (el): el is HTMLElement => el instanceof HTMLElement,
  );
  savedOverflow = targets.map((el) => [el, el.style.overflow]);
  for (const el of targets) el.style.overflow = "hidden";
}

export function unlockBackgroundScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return;
  for (const [el, overflow] of savedOverflow) el.style.overflow = overflow;
  savedOverflow = [];
}
