import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { colors } from "./tokens";

const css = readFileSync(path.join(__dirname, "tokens.css"), "utf8");
const cssColors = Object.fromEntries(
  [...css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9A-Fa-f]+);/g)].map(([, name, value]) => [
    name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase()),
    value,
  ]),
);

describe("design tokens", () => {
  it("keeps every CSS color token mirrored in tokens.ts with the same value", () => {
    for (const [name, value] of Object.entries(cssColors)) {
      expect(colors[name as keyof typeof colors], name).toBe(value);
    }
  });

  it("has no JS-only color except white", () => {
    const jsOnly = Object.keys(colors).filter((name) => !(name in cssColors));
    expect(jsOnly).toEqual(["white"]);
  });
});
