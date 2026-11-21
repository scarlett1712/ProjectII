import { describe, expect, it } from "vitest";
import { getTagStyles } from "./tagStyles";
import { colors, effects, primaryTagBackground } from "./tokens";

describe("getTagStyles", () => {
  it("falls back to the brand tag style without a colour", () => {
    expect(getTagStyles("")).toEqual({
      backgroundColor: primaryTagBackground,
      color: colors.primary,
      border: effects.primaryBorder,
    });
  });

  it("darkens the text strongly on very light backgrounds", () => {
    // brightness(#ffffff) = 255 → factor 0.35 → 255 * 0.35 = 89 = 0x59
    expect(getTagStyles("#ffffff")).toEqual({ backgroundColor: "#ffffff", color: "#595959", border: "1px solid #59595930" });
  });

  it("expands 3-digit hex and darkens medium-light backgrounds less", () => {
    // #aaa → #aaaaaa, brightness 170 → factor 0.45 → floor(170 * 0.45) = 76 = 0x4c
    expect(getTagStyles("#aaa")).toEqual({ backgroundColor: "#aaa", color: "#4c4c4c", border: "1px solid #4c4c4c30" });
  });

  it("uses white text on dark backgrounds", () => {
    expect(getTagStyles("#222222")).toEqual({
      backgroundColor: "#222222",
      color: colors.white,
      border: effects.onColorBorder,
    });
  });
});
