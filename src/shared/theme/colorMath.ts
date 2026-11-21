/** Three color channels ranging from 0 to 255. */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parse six- or three-digit hex colors with an optional leading hash. */
export function parseHex(hexColor: string): Rgb {
  let hex = hexColor.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

/** Perceived brightness on the YIQ scale from 0 to 255. */
export function brightness({ r, g, b }: Rgb): number {
  return (r * 299 + g * 587 + b * 114) / 1000;
}

const toHex = (value: number) => value.toString(16).padStart(2, "0");

/** Multiply each channel by factor to produce a darker shade of the same hue. */
export function darken({ r, g, b }: Rgb, factor: number): string {
  const scale = (channel: number) => Math.max(0, Math.min(255, Math.floor(channel * factor)));
  return `#${toHex(scale(r))}${toHex(scale(g))}${toHex(scale(b))}`;
}

/**
 * Readable text for a light hexColor background on a calendar card or sticky note. Use a darker shade of the background hue,
 * increasing the contrast for lighter backgrounds.
 */
export function darkenedTextColor(hexColor: string): string {
  const rgb = parseHex(hexColor);
  return darken(rgb, brightness(rgb) > 150 ? 0.35 : 0.6);
}
