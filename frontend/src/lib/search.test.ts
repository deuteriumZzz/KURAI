import { describe, expect, it } from "vitest";
import { findMatches } from "./search";

describe("findMatches", () => {
  it("finds case-insensitive, treats ё as е", () => {
    expect(findMatches(["Ещё раз", "Тарифы", "еще"], "ЕЩЕ")).toEqual([0, 2]);
  });
  it("empty query matches nothing", () => {
    expect(findMatches(["a"], "  ")).toEqual([]);
  });
});
