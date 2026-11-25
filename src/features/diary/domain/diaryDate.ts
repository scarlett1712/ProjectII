/** Validate a YYYY-MM-DD local day key. */
export function isValidDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Validate a YYYY-MM month key. */
export function isValidMonthKey(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

/** Format a Date into a YYYY-MM-DD key using local calendar components. */
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Format a Date into a YYYY-MM key using local calendar components. */
export function toLocalMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Format a compact VND tag for photo badges (e.g. "-50k", "+1.2tr", "-250đ").
 * Keeps the badge short enough to sit cleanly in the top-right corner of a photo.
 */
export function formatShortCurrencyTag(amount: number, type: "INCOME" | "EXPENSE" | "TRANSFER"): string {
  const prefix = type === "INCOME" ? "+" : type === "EXPENSE" ? "-" : "";
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    const millions = abs / 1_000_000;
    const formatted = Number.isInteger(millions) ? String(millions) : millions.toFixed(1).replace(/\.0$/, "");
    return `${prefix}${formatted}tr`;
  }
  if (abs >= 1_000) {
    const thousands = Math.round(abs / 1_000);
    return `${prefix}${thousands}k`;
  }
  return `${prefix}${Math.round(abs)}đ`;
}
