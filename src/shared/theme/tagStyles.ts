import { colors, effects, primaryTagBackground } from "./tokens";

export interface TagStyle {
  backgroundColor: string;
  color: string;
  border: string;
}

const toHex = (value: number) => value.toString(16).padStart(2, "0");

/** Multiply each RGB channel by factor for a darker shade of the same hue. */
function darken(r: number, g: number, b: number, factor: number): string {
  const scale = (channel: number) => Math.max(0, Math.min(255, Math.floor(channel * factor)));
  return `#${toHex(scale(r))}${toHex(scale(g))}${toHex(scale(b))}`;
}

/**
 * Tag background, text and border based on brightness. Light backgrounds use darker text of the same hue,
 * and dark backgrounds use white text. Uncolored tags use the default brand style.
 */
export function getTagStyles(hexColor: string): TagStyle {
  if (!hexColor) return { backgroundColor: primaryTagBackground, color: colors.primary, border: effects.primaryBorder };

  let hex = hexColor.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  if (brightness > 130) {
    const textColor = darken(r, g, b, brightness > 180 ? 0.35 : 0.45);
    return { backgroundColor: hexColor, color: textColor, border: `1px solid ${textColor}30` };
  }
  return { backgroundColor: hexColor, color: colors.white, border: effects.onColorBorder };
}
