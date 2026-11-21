import { describe, expect, it } from "vitest";
import { brightness, darken, darkenedTextColor, parseHex } from "./colorMath";

describe("parseHex", () => {
  it("reads 6-digit hex with or without #", () => {
    expect(parseHex("#ff8000")).toEqual({ r: 255, g: 128, b: 0 });
    expect(parseHex("ff8000")).toEqual({ r: 255, g: 128, b: 0 });
  });

  it("expands 3-digit hex", () => {
    expect(parseHex("#abc")).toEqual({ r: 0xaa, g: 0xbb, b: 0xcc });
  });
});

describe("brightness", () => {
  it("is 255 for white and 0 for black", () => {
    expect(brightness({ r: 255, g: 255, b: 255 })).toBe(255);
    expect(brightness({ r: 0, g: 0, b: 0 })).toBe(0);
  });
});

describe("darken", () => {
  it("scales and clamps every channel", () => {
    expect(darken({ r: 255, g: 100, b: 0 }, 0.5)).toBe("#7f3200");
    expect(darken({ r: 200, g: 200, b: 200 }, 2)).toBe("#ffffff");
  });
});

describe("darkenedTextColor", () => {
  it("darkens light backgrounds strongly (factor 0.35)", () => {
    // #fdfd96: brightness ≈ 235 → 253*0.35 = 88 (0x58), 150*0.35 = 52 (0x34)
    expect(darkenedTextColor("#fdfd96")).toBe("#585834");
  });

  it("darkens darker backgrounds less (factor 0.6)", () => {
    // #808080: brightness 128 → 128*0.6 = 76 (0x4c)
    expect(darkenedTextColor("#808080")).toBe("#4c4c4c");
  });
});
