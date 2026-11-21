/** Height of one hour row in pixels in the week and day grids. */
export const HOUR_ROW_PX = 50;

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/** Visible hours from 0 through 23, excluding those hidden by the user. */
export function visibleHours(hiddenHours: readonly number[]): number[] {
  return HOURS.filter((hour) => !hiddenHours.includes(hour));
}

/** Day column height after hiding hour rows. */
export function dayColumnHeight(hiddenHours: readonly number[]): number {
  return (24 - hiddenHours.length) * HOUR_ROW_PX;
}

/** Hour label in HH:00 format. */
export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}
