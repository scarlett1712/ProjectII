/**
 * JavaScript equivalents of tokens.css colors for use outside Tailwind classes:
 * inline styles, SVG attributes, Recharts, metadata, the manifest and persisted defaults.
 * Names are camelCase versions of --color-* tokens. tokens.test.ts verifies that the two files match.
 */
export const colors = {
  primary: "#A172FD",
  primaryHover: "#8B5CF6",
  primaryLight: "#A78BFA",
  primaryStrong: "#6D28D9",
  primaryInk: "#581C87",
  primaryMuted: "#C4B5FD",
  primaryBorder: "#D8CFFD",
  primaryLine: "#E9D5FF",
  primaryLineStrong: "#D8B4FE",
  primaryTint: "#EDE9FE",
  primaryFaint: "#EAE5FF",
  primarySubtle: "#F0ECFF",
  primarySoft: "#F5F3FF",
  inkStrong: "#1F2937",
  ink: "#374151",
  inkSecondary: "#4B5563",
  inkMuted: "#6B7280",
  inkSubtle: "#9CA3AF",
  line: "#E5E7EB",
  surfaceMuted: "#F3F4F6",
  success: "#10B981",
  danger: "#EF4444",
  note: "#fdfd96",
  noteInk: "#b45309",
  waterStrong: "#0369A1",
  water: "#0284C7",
  waterRing: "#38BDF8",
  waterMuted: "#BAE6FD",
  waterSoft: "#E0F2FE",
  urgencyCritical: "#F87171",
  urgencyWarning: "#93C5FD",
  urgencyNormal: "#A7F3D0",
  mealBreakfast: "#D97706",
  mealBreakfastSoft: "#FEF3C7",
  mealLunch: "#059669",
  mealLunchSoft: "#D1FAE5",
  mealDinner: "#2563EB",
  mealDinnerSoft: "#DBEAFE",
  mealSnack: "#7C3AED",
  mealSnackSoft: "#F3E8FF",
  accentIndigo: "#4F46E5",
  accentIndigoSoft: "#E0E7FF",
  accentGreen: "#22C55E",
  accentGreenSoft: "#DCFCE7",
  splashFrom: "#9BA4FF",
  splashTo: "#FF9BE2",
  white: "#FFFFFF",
};

export type ColorToken = keyof typeof colors;

/** Effects outside the Tailwind shadow scale, used in inline styles and animations. */
export const effects = {
  /** Dark overlay surrounding the highlighted onboarding tour target. */
  spotlightScrim: "0 0 0 9999px rgba(15, 10, 30, 0.65)",
  /** Border for a dark tag background. */
  onColorBorder: "1px solid rgba(255, 255, 255, 0.15)",
  /** Default tag border when no color is selected. */
  primaryBorder: "1px solid rgba(161, 114, 253, 0.3)",
  /** Pulsing golden glow around the star mascot. */
  starGlow: "drop-shadow(0 0 20px rgba(253, 224, 71, 0.8))",
  starGlowPeak: "drop-shadow(0 0 45px rgba(253, 224, 71, 0.95))",
  starShadow: "drop-shadow(0 2px 8px rgba(0,0,0,0.08))",
} as const;

/** Translucent primary background for an uncolored tag (hex color with alpha 0x15). */
export const primaryTagBackground = `${colors.primary}15`;
