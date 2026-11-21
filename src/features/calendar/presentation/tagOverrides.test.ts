import { describe, expect, it } from "vitest";
import { applyTagOverrides } from "./tagOverrides";

describe("applyTagOverrides", () => {
  const tags = [
    { id: "system-work", name: "Work", color: "#111111" },
    { id: "t1", name: "Mine", color: "#222222" },
  ];

  it("chỉ ghép bản ghi đè vào tag hệ thống", () => {
    const result = applyTagOverrides(tags, {
      "system-work": { name: "Cong viec", color: "#333333" },
      t1: { name: "Ignored", color: "#444444" },
    });
    expect(result).toEqual([
      { id: "system-work", name: "Cong viec", color: "#333333" },
      { id: "t1", name: "Mine", color: "#222222" },
    ]);
  });

  it("danh sách rỗng hoặc null trả mảng rỗng", () => {
    expect(applyTagOverrides(null, {})).toEqual([]);
  });
});
