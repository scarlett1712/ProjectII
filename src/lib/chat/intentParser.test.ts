import { describe, expect, it } from "vitest";
import { parseIntent } from "./intentParser";

describe("parseIntent", () => {
  it("parses meal intent", () => {
    const intent = parseIntent("Toi vua an bua sang 400 cal");
    expect(intent.type).toBe("ADD_MEAL");
  });

  it("parses water intent", () => {
    const intent = parseIntent("nhac toi uong 2l nuoc");
    expect(intent.type).toBe("SET_WATER_GOAL");
  });
});
