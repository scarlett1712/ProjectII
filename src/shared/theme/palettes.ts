import { colors } from "./tokens";

/**
 * User-selectable colors for tags, accounts, categories and sticky notes. These values are persisted to the database,
 * so keep their hex codes independent of presentation tokens.
 */
export const boldColors = [
  "#A172FD", // Violet
  "#3B82F6", // Blue
  "#EC4899", // Pink
  "#F97316", // Orange
  "#10B981", // Green
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#06B6D4", // Turquoise
  "#F59E0B", // Amber/Gold
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#D946EF"  // Fuchsia
];

export const pastelColors = [
  "#C4B5FD", // Lavender Pastel
  "#93C5FD", // Blue Pastel
  "#FBCFE8", // Pink Pastel
  "#FED7AA", // Orange Pastel
  "#A7F3D0", // Green Pastel
  "#FCA5A5", // Red Pastel
  "#E9D5FF", // Purple Pastel
  "#99F6E4", // Teal Pastel
  "#FEF08A", // Yellow Pastel
  "#C7D2FE", // Indigo Pastel
  "#BAE6FD", // Light Blue Pastel
  "#F5D0FE"  // Fuchsia Pastel
];

/** Default yellow shades for sticky notes. Other colors count as custom. */
export const defaultNoteYellows = ["#fcd34d", "#fdfd96", "#fef3c7"];

/** Default colors for new tags, accounts, categories, events and sticky notes. */
export const defaultColors = {
  tag: colors.primary,
  event: colors.primaryHover,
  note: colors.note,
};
